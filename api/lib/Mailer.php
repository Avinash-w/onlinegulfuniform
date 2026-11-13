<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/ContentController.php';

class Mailer
{
    /**
     * Send email via SMTP (Socket based) or fallback to PHP mail()
     * Supports inline CID image attachments and multipart/alternative / multipart/related.
     */
    public static function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlContent,
        string $textContent = '',
        array $inlineImages = []
    ): bool {
        $config = app_config();
        
        $smtpEnabled = !empty($config['smtp_enabled']) || !empty($config['smtp_host']);
        $fromEmail = $config['mail_from_email'] ?? $config['smtp_user'] ?? 'no-reply@evaranest.com';
        $fromName = $config['mail_from_name'] ?? 'EvaraNest Lifestyle';

        if (empty($textContent)) {
            $textContent = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlContent));
        }

        if ($smtpEnabled && !empty($config['smtp_user']) && !empty($config['smtp_pass'])) {
            try {
                return self::sendSmtp($toEmail, $toName, $subject, $htmlContent, $textContent, $inlineImages, $config);
            } catch (Throwable $e) {
                error_log('[Mailer SMTP Error] ' . $e->getMessage());
                return self::sendPhpMail($toEmail, $toName, $subject, $htmlContent, $textContent, $inlineImages, $fromEmail, $fromName);
            }
        }

        return self::sendPhpMail($toEmail, $toName, $subject, $htmlContent, $textContent, $inlineImages, $fromEmail, $fromName);
    }

    /**
     * Native RFC-compliant SMTP Socket Client with STARTTLS, AUTH LOGIN, and Inline CID Attachments
     */
    private static function sendSmtp(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlContent,
        string $textContent,
        array $inlineImages,
        array $config
    ): bool {
        $host = $config['smtp_host'] ?? 'smtp.gmail.com';
        $port = (int) ($config['smtp_port'] ?? 587);
        $encryption = strtolower($config['smtp_encryption'] ?? ($port === 465 ? 'ssl' : 'tls'));
        $user = $config['smtp_user'] ?? '';
        $pass = $config['smtp_pass'] ?? '';
        $fromEmail = $config['mail_from_email'] ?? $user;
        $fromName = $config['mail_from_name'] ?? 'EvaraNest Lifestyle';
        $timeout = (int) ($config['smtp_timeout'] ?? 6);

        $remoteHost = ($encryption === 'ssl' ? 'ssl://' : '') . $host;
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ],
        ]);

        $socket = @stream_socket_client(
            $remoteHost . ':' . $port,
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if (!$socket) {
            throw new RuntimeException("Could not connect to SMTP server {$host}:{$port} ({$errno}: {$errstr})");
        }

        stream_set_timeout($socket, $timeout);

        $readResponse = function () use ($socket): string {
            $res = '';
            while ($line = fgets($socket, 515)) {
                $res .= $line;
                if (isset($line[3]) && $line[3] === ' ') {
                    break;
                }
            }
            return $res;
        };

        $sendCommand = function (string $cmd, array $expectedCodes) use ($socket, $readResponse) {
            fwrite($socket, $cmd . "\r\n");
            $response = $readResponse();
            $code = substr($response, 0, 3);
            if (!in_array($code, $expectedCodes, true)) {
                throw new RuntimeException("SMTP Command failed: [{$cmd}] Response: {$response}");
            }
            return $response;
        };

        $initialGreeting = $readResponse();
        if (substr($initialGreeting, 0, 3) !== '220') {
            fclose($socket);
            throw new RuntimeException("SMTP Initial Greeting Failed: {$initialGreeting}");
        }

        $localhost = gethostname() ?: 'localhost';
        $sendCommand("EHLO {$localhost}", ['250']);

        // Upgrade connection to TLS
        if ($encryption === 'tls' || $port === 587) {
            $sendCommand('STARTTLS', ['220']);
            $cryptoMethod = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
            }
            $cryptoOk = stream_socket_enable_crypto($socket, true, $cryptoMethod);
            if (!$cryptoOk) {
                fclose($socket);
                throw new RuntimeException("TLS Handshake failed on {$host}:{$port}");
            }
            $sendCommand("EHLO {$localhost}", ['250']);
        }

        // Authenticate with AUTH LOGIN
        $sendCommand('AUTH LOGIN', ['334']);
        $sendCommand(base64_encode($user), ['334']);
        $sendCommand(base64_encode($pass), ['235']);

        // MAIL FROM & RCPT TO
        $sendCommand("MAIL FROM:<{$user}>", ['250']);
        $sendCommand("RCPT TO:<{$toEmail}>", ['250', '251']);

        // DATA
        $sendCommand('DATA', ['354']);

        $dateHeader = date('r');
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $encodedToName = '=?UTF-8?B?' . base64_encode($toName) . '?=';

        $rawEmail = [
            "Date: {$dateHeader}",
            "From: {$encodedFromName} <{$fromEmail}>",
            "Reply-To: {$encodedFromName} <{$fromEmail}>",
            "To: {$encodedToName} <{$toEmail}>",
            "Subject: {$encodedSubject}",
            "Message-ID: <" . time() . '.' . bin2hex(random_bytes(6)) . "@evaranest.com>",
            "X-Mailer: EvaraNest Luxury Engine 3.0",
            "MIME-Version: 1.0",
        ];

        // If inline images present, use multipart/related containing multipart/alternative
        if (!empty($inlineImages)) {
            $relatedBoundary = '=_evn_rel_' . md5((string) microtime(true));
            $altBoundary = '=_evn_alt_' . md5((string) microtime(true) . '1');

            $rawEmail[] = "Content-Type: multipart/related; boundary=\"{$relatedBoundary}\"";
            $rawEmail[] = "";
            $rawEmail[] = "--{$relatedBoundary}";
            $rawEmail[] = "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"";
            $rawEmail[] = "";
            $rawEmail[] = "--{$altBoundary}";
            $rawEmail[] = "Content-Type: text/plain; charset=UTF-8";
            $rawEmail[] = "Content-Transfer-Encoding: base64";
            $rawEmail[] = "";
            $rawEmail[] = chunk_split(base64_encode($textContent));
            $rawEmail[] = "--{$altBoundary}";
            $rawEmail[] = "Content-Type: text/html; charset=UTF-8";
            $rawEmail[] = "Content-Transfer-Encoding: base64";
            $rawEmail[] = "";
            $rawEmail[] = chunk_split(base64_encode($htmlContent));
            $rawEmail[] = "--{$altBoundary}--";

            // Attach inline images
            foreach ($inlineImages as $cid => $imgInfo) {
                $rawEmail[] = "--{$relatedBoundary}";
                $rawEmail[] = "Content-Type: " . ($imgInfo['mime'] ?? 'image/jpeg') . "; name=\"" . ($imgInfo['name'] ?? 'image.jpg') . "\"";
                $rawEmail[] = "Content-Transfer-Encoding: base64";
                $rawEmail[] = "Content-ID: <{$cid}>";
                $rawEmail[] = "Content-Disposition: inline; filename=\"" . ($imgInfo['name'] ?? 'image.jpg') . "\"";
                $rawEmail[] = "";
                $rawEmail[] = chunk_split(base64_encode($imgInfo['data']));
            }
            $rawEmail[] = "--{$relatedBoundary}--";
        } else {
            $altBoundary = '=_evn_alt_' . md5((string) microtime(true));
            $rawEmail[] = "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"";
            $rawEmail[] = "";
            $rawEmail[] = "--{$altBoundary}";
            $rawEmail[] = "Content-Type: text/plain; charset=UTF-8";
            $rawEmail[] = "Content-Transfer-Encoding: base64";
            $rawEmail[] = "";
            $rawEmail[] = chunk_split(base64_encode($textContent));
            $rawEmail[] = "--{$altBoundary}";
            $rawEmail[] = "Content-Type: text/html; charset=UTF-8";
            $rawEmail[] = "Content-Transfer-Encoding: base64";
            $rawEmail[] = "";
            $rawEmail[] = chunk_split(base64_encode($htmlContent));
            $rawEmail[] = "--{$altBoundary}--";
        }

        $rawEmail[] = ".";
        $payload = implode("\r\n", $rawEmail) . "\r\n";
        fwrite($socket, $payload);

        $dataRes = $readResponse();
        $code = substr($dataRes, 0, 3);
        if ($code !== '250') {
            fclose($socket);
            throw new RuntimeException("SMTP DATA Send Failed: {$dataRes}");
        }

        $sendCommand('QUIT', ['221', '250']);
        fclose($socket);

        return true;
    }

    /**
     * Fallback standard mail() handler with CID inline image support
     */
    private static function sendPhpMail(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlContent,
        string $textContent,
        array $inlineImages,
        string $fromEmail,
        string $fromName
    ): bool {
        $to = "{$toName} <{$toEmail}>";
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

        if (!empty($inlineImages)) {
            $relatedBoundary = '=_evn_rel_' . md5((string) microtime(true));
            $altBoundary = '=_evn_alt_' . md5((string) microtime(true) . '1');

            $headers = [
                "MIME-Version: 1.0",
                "From: {$fromName} <{$fromEmail}>",
                "Reply-To: {$fromName} <{$fromEmail}>",
                "Content-Type: multipart/related; boundary=\"{$relatedBoundary}\"",
                "X-Mailer: PHP/" . phpversion(),
            ];

            $body = "--{$relatedBoundary}\r\n";
            $body .= "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"\r\n\r\n";
            $body .= "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($textContent)) . "\r\n\r\n";
            $body .= "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($htmlContent)) . "\r\n\r\n";
            $body .= "--{$altBoundary}--\r\n\r\n";

            foreach ($inlineImages as $cid => $imgInfo) {
                $body .= "--{$relatedBoundary}\r\n";
                $body .= "Content-Type: " . ($imgInfo['mime'] ?? 'image/jpeg') . "; name=\"" . ($imgInfo['name'] ?? 'image.jpg') . "\"\r\n";
                $body .= "Content-Transfer-Encoding: base64\r\n";
                $body .= "Content-ID: <{$cid}>\r\n";
                $body .= "Content-Disposition: inline; filename=\"" . ($imgInfo['name'] ?? 'image.jpg') . "\"\r\n\r\n";
                $body .= chunk_split(base64_encode($imgInfo['data'])) . "\r\n\r\n";
            }
            $body .= "--{$relatedBoundary}--";
        } else {
            $altBoundary = '=_evn_alt_' . md5((string) microtime(true));
            $headers = [
                "MIME-Version: 1.0",
                "From: {$fromName} <{$fromEmail}>",
                "Reply-To: {$fromName} <{$fromEmail}>",
                "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"",
                "X-Mailer: PHP/" . phpversion(),
            ];

            $body = "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($textContent)) . "\r\n\r\n";
            $body .= "--{$altBoundary}\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($htmlContent)) . "\r\n\r\n";
            $body .= "--{$altBoundary}--";
        }

        return @mail($to, $encodedSubject, $body, implode("\r\n", $headers));
    }

    /**
     * Resolves local image files or downloads remote thumbnails to embed as inline CID
     */
    public static function processInlineImages(array $lines): array
    {
        $inlineImages = [];
        $processedLines = [];

        $docRoots = [
            realpath(__DIR__ . '/../../public'),
            realpath(__DIR__ . '/../../dist'),
            realpath(__DIR__ . '/../uploads'),
            realpath(__DIR__ . '/../..'),
        ];

        foreach ($lines as $idx => $line) {
            $imgRaw = trim((string) ($line['image'] ?? ''));
            $cid = 'item_img_' . $idx;
            $hasCid = false;

            if ($imgRaw !== '') {
                // If it's a local path e.g. /images/products/perfume-bars.jpg or uploads/...
                if (!preg_match('~^https?://~i', $imgRaw)) {
                    $cleaned = '/' . ltrim($imgRaw, '/\\');
                    foreach ($docRoots as $root) {
                        if (!$root) continue;
                        $candidate = $root . $cleaned;
                        if (file_exists($candidate) && is_file($candidate)) {
                            $ext = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));
                            $mime = $ext === 'png' ? 'image/png' : ($ext === 'webp' ? 'image/webp' : 'image/jpeg');
                            $data = @file_get_contents($candidate);
                            if ($data !== false && strlen($data) > 0) {
                                $inlineImages[$cid] = [
                                    'name' => basename($candidate),
                                    'mime' => $mime,
                                    'data' => $data,
                                ];
                                $hasCid = true;
                                break;
                            }
                        }
                    }
                } else {
                    // It's a remote URL: try to download thumbnail for reliable CID embedding
                    $ctx = stream_context_create(['http' => ['timeout' => 2.5]]);
                    $remoteData = @file_get_contents($imgRaw, false, $ctx);
                    if ($remoteData !== false && strlen($remoteData) > 0 && strlen($remoteData) < 2000000) {
                        $ext = strtolower(pathinfo(parse_url($imgRaw, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION));
                        $mime = $ext === 'png' ? 'image/png' : ($ext === 'webp' ? 'image/webp' : 'image/jpeg');
                        $inlineImages[$cid] = [
                            'name' => "item_{$idx}.jpg",
                            'mime' => $mime,
                            'data' => $remoteData,
                        ];
                        $hasCid = true;
                    }
                }
            }

            $line['_cid'] = $hasCid ? $cid : null;
            $line['_fallback_url'] = $imgRaw;
            $processedLines[] = $line;
        }

        return [$processedLines, $inlineImages];
    }

    /* -------------------------------------------------------------------------
     * HIGH-LEVEL TEMPLATED EMAILS (Order Placed, Paid/Invoice, Shipped, Delivered)
     * ------------------------------------------------------------------------- */

    /**
     * Triggered immediately when customer places an order
     */
    public static function sendOrderPlaced(array $order, ?array $payment = null): bool
    {
        $toEmail = trim($order['email'] ?? $order['address']['email'] ?? '');
        if (!$toEmail || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $customerName = trim($order['customerName'] ?? $order['address']['name'] ?? 'Valued Customer');
        $orderId = $order['id'];
        $isPaid = ($payment['status'] ?? '') === 'Paid' || (($order['status'] ?? '') === 'Confirmed' && ($payment['method'] ?? '') !== 'COD');

        $subject = $isPaid
            ? "✨ Order Confirmed & Payment Received: #{$orderId} – EvaraNest"
            : "🌿 Order Received: #{$orderId} – EvaraNest Lifestyle";

        [$processedLines, $inlineImages] = self::processInlineImages($order['lines'] ?? []);
        $order['lines'] = $processedLines;

        $html = self::renderOrderEmailTemplate($order, $payment, [
            'step' => $isPaid ? 2 : 1, // 1: Placed, 2: Confirmed, 3: Shipped, 4: Delivered
            'badge' => $isPaid ? 'Payment Confirmed' : 'Order Placed',
            'badgeColor' => $isPaid ? '#0F944E' : '#4849E8',
            'headline' => $isPaid ? 'Thank you for your order!' : 'We’ve received your order!',
            'subheadline' => $isPaid
                ? "Your payment was successful and order <strong>#{$orderId}</strong> is now being hand-poured & carefully packed."
                : "Thank you for shopping with EvaraNest! Your order <strong>#{$orderId}</strong> has been received and will be processed promptly.",
            'showInvoice' => $isPaid,
            'showTrackingBtn' => true,
        ]);

        return self::send($toEmail, $customerName, $subject, $html, '', $inlineImages);
    }

    /**
     * Triggered when payment succeeds or is marked Paid
     */
    public static function sendOrderPaid(array $order, array $payment): bool
    {
        $toEmail = trim($order['email'] ?? $order['address']['email'] ?? '');
        if (!$toEmail || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $customerName = trim($order['customerName'] ?? $order['address']['name'] ?? 'Valued Customer');
        $orderId = $order['id'];
        $subject = "🧾 Tax Invoice & Payment Receipt for Order #{$orderId} – EvaraNest";

        [$processedLines, $inlineImages] = self::processInlineImages($order['lines'] ?? []);
        $order['lines'] = $processedLines;

        $html = self::renderOrderEmailTemplate($order, $payment, [
            'step' => 2,
            'badge' => 'Payment Confirmed & Invoice',
            'badgeColor' => '#0F944E',
            'headline' => 'Payment Received & Tax Invoice',
            'subheadline' => "Thank you! We received your payment of <strong>₹" . number_format((float) ($payment['amount'] ?? $order['total']), 2) . "</strong>. Your invoice is generated below.",
            'showInvoice' => true,
            'showTrackingBtn' => true,
        ]);

        return self::send($toEmail, $customerName, $subject, $html, '', $inlineImages);
    }

    /**
     * Triggered when order status changes to 'Shipped'
     */
    public static function sendOrderShipped(array $order, ?array $shipment = null): bool
    {
        $toEmail = trim($order['email'] ?? $order['address']['email'] ?? '');
        if (!$toEmail || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $customerName = trim($order['customerName'] ?? $order['address']['name'] ?? 'Valued Customer');
        $orderId = $order['id'];
        $carrier = $shipment['carrier'] ?? 'Delhivery / Bluedart';
        $awb = $shipment['awb'] ?? 'In transit';

        $subject = "🚚 Your EvaraNest Order #{$orderId} Has Shipped!";

        [$processedLines, $inlineImages] = self::processInlineImages($order['lines'] ?? []);
        $order['lines'] = $processedLines;

        $html = self::renderOrderEmailTemplate($order, null, [
            'step' => 3,
            'badge' => 'Dispatched & On the Way',
            'badgeColor' => '#4849E8',
            'headline' => 'Your handcrafted candles are on the way!',
            'subheadline' => "Great news! Your package for order <strong>#{$orderId}</strong> has been handed over to <strong>{$carrier}</strong> (AWB # <strong>{$awb}</strong>).",
            'showTrackingCard' => true,
            'shipment' => $shipment,
            'showTrackingBtn' => true,
        ]);

        return self::send($toEmail, $customerName, $subject, $html, '', $inlineImages);
    }

    /**
     * Triggered when order status changes to 'Delivered'
     */
    public static function sendOrderDelivered(array $order, ?array $shipment = null): bool
    {
        $toEmail = trim($order['email'] ?? $order['address']['email'] ?? '');
        if (!$toEmail || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $customerName = trim($order['customerName'] ?? $order['address']['name'] ?? 'Valued Customer');
        $orderId = $order['id'];

        $subject = "✨ Delivered: Your EvaraNest Order #{$orderId} has arrived!";

        [$processedLines, $inlineImages] = self::processInlineImages($order['lines'] ?? []);
        $order['lines'] = $processedLines;

        $html = self::renderOrderEmailTemplate($order, null, [
            'step' => 4,
            'badge' => 'Delivered Successfully',
            'badgeColor' => '#0F944E',
            'badgeBg' => '#E8F5E9',
            'headline' => 'Your order has been delivered!',
            'subheadline' => "We hope your artisanal botanical candles and home fragrances bring warmth, serenity, and luxury to your home.",
            'showDeliveredCare' => true,
            'showTrackingBtn' => false,
            'showShopMoreBtn' => true,
        ]);

        return self::send($toEmail, $customerName, $subject, $html, '', $inlineImages);
    }

    /**
     * Triggered when an order is cancelled
     */
    public static function sendOrderCancelled(array $order, ?string $reason = null): bool
    {
        $toEmail = trim($order['email'] ?? $order['address']['email'] ?? '');
        if (!$toEmail || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $customerName = trim($order['customerName'] ?? $order['address']['name'] ?? 'Valued Customer');
        $orderId = $order['id'];
        $payment = $order['_payment'] ?? null;
        $isPrepaid = ($payment['method'] ?? '') !== 'COD' && (($payment['status'] ?? '') === 'Paid' || ($payment['status'] ?? '') === 'Refund Pending' || ($payment['status'] ?? '') === 'Refunded');

        $subject = "❌ Order Update: Your EvaraNest Order #{$orderId} has been cancelled";

        [$processedLines, $inlineImages] = self::processInlineImages($order['lines'] ?? []);
        $order['lines'] = $processedLines;

        $refundNote = $isPrepaid
            ? "<br /><br /><strong>💳 Refund Status:</strong> Since your order was paid online, your refund of <strong>₹" . number_format((float) ($order['total'] ?? 0), 2) . "</strong> has been initiated and will be credited back to your original payment method within 5–7 business days."
            : "<br /><br />Since this was a Cash on Delivery order, no payment was charged.";

        $html = self::renderOrderEmailTemplate($order, $payment, [
            'hideStepper' => true,
            'badge' => 'Order Cancelled',
            'badgeColor' => '#DC2626',
            'badgeBg' => '#FEE2E2',
            'headline' => "Order #{$orderId} has been cancelled",
            'subheadline' => "We are writing to confirm that your order <strong>#{$orderId}</strong> has been cancelled." . ($reason ? " (Reason: <em>" . htmlspecialchars($reason) . "</em>)" : "") . $refundNote,
            'showCancelledCard' => true,
            'cancellationReason' => $reason,
            'showTrackingBtn' => false,
            'showShopMoreBtn' => true,
        ]);

        return self::send($toEmail, $customerName, $subject, $html, '', $inlineImages);
    }

    /**
     * Triggered when a refund is processed
     */
    public static function sendRefundProcessed(array $order, ?array $refund = null, ?array $payment = null): bool
    {
        $toEmail = trim($order['email'] ?? $order['address']['email'] ?? '');
        if (!$toEmail || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $customerName = trim($order['customerName'] ?? $order['address']['name'] ?? 'Valued Customer');
        $orderId = $order['id'];
        $refundAmount = (float) ($refund['amount'] ?? $payment['amount'] ?? $order['total'] ?? 0);
        $refundId = $refund['id'] ?? ('RF-' . $orderId);
        $refundReason = $refund['reason'] ?? 'Order cancellation / Customer refund';
        $payMethod = $payment['method'] ?? $order['paymentMethod'] ?? 'Original Payment Method';

        $subject = "💸 Refund Processed: ₹" . number_format($refundAmount, 2) . " for Order #{$orderId} – EvaraNest";

        [$processedLines, $inlineImages] = self::processInlineImages($order['lines'] ?? []);
        $order['lines'] = $processedLines;

        $html = self::renderOrderEmailTemplate($order, $payment, [
            'hideStepper' => true,
            'badge' => 'Refund Processed Successfully',
            'badgeColor' => '#059669',
            'badgeBg' => '#D1FAE5',
            'headline' => 'Your Refund Has Been Processed',
            'subheadline' => "We have successfully processed a refund of <strong>₹" . number_format($refundAmount, 2) . "</strong> for your order <strong>#{$orderId}</strong>. The funds will reflect in your source account / bank within <strong>5–7 business days</strong>.",
            'showRefundCard' => true,
            'refundInfo' => [
                'id' => $refundId,
                'amount' => $refundAmount,
                'reason' => $refundReason,
                'method' => $payMethod,
            ],
            'showTrackingBtn' => false,
            'showShopMoreBtn' => true,
        ]);

        return self::send($toEmail, $customerName, $subject, $html, '', $inlineImages);
    }

    /**
     * Triggered when customer requests an OTP code
     */
    public static function sendOtp(string $email, string $code, string $mode = 'Verification'): bool
    {
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $subject = "{$code} is your EvaraNest verification code";
        $modeLabel = $mode === 'login' ? 'Login' : ($mode === 'signup' ? 'Sign Up' : 'Verification');

        $html = self::renderOtpEmailTemplate($email, $code, $modeLabel);
        return self::send($email, 'Valued Customer', $subject, $html);
    }

    /**
     * Renders a visually creative, luxury-grade responsive HTML Email Template
     */
    private static function renderOrderEmailTemplate(array $order, ?array $payment, array $options = []): string
    {
        $config = app_config();
        $storeUrl = rtrim($config['storefront_url'] ?? 'http://localhost:5173', '/');
        $orderId = $order['id'];
        $lines = $order['lines'] ?? [];
        $address = $order['address'] ?? [];
        $subtotal = (float) ($order['subtotal'] ?? 0);
        $shipping = (float) ($order['shipping'] ?? 0);
        $discount = (float) ($order['discount'] ?? 0);
        $total = (float) ($order['total'] ?? 0);

        $step = (int) ($options['step'] ?? 1); // 1 to 4
        $hideStepper = !empty($options['hideStepper']);
        $badge = $options['badge'] ?? 'Order Update';
        $badgeColor = $options['badgeColor'] ?? '#4849E8';
        $badgeBg = $options['badgeBg'] ?? '#EEEDFC';
        $headline = $options['headline'] ?? 'Order Notification';
        $subheadline = $options['subheadline'] ?? '';
        $showInvoice = !empty($options['showInvoice']);
        $showTrackingCard = !empty($options['showTrackingCard']);
        $showDeliveredCare = !empty($options['showDeliveredCare']);
        $showCancelledCard = !empty($options['showCancelledCard']);
        $showRefundCard = !empty($options['showRefundCard']);
        $showTrackingBtn = !isset($options['showTrackingBtn']) || !empty($options['showTrackingBtn']);
        $showShopMoreBtn = !empty($options['showShopMoreBtn']);
        $shipment = $options['shipment'] ?? null;
        $refundInfo = $options['refundInfo'] ?? [];

        $trackUrl = "{$storeUrl}/track/{$orderId}";
        $invoiceUrl = "{$storeUrl}/invoice/{$orderId}";

        // Step tracker markup
        $steps = [
            1 => 'Placed',
            2 => 'Confirmed',
            3 => 'Shipped',
            4 => 'Delivered',
        ];
        $stepperHtml = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 10px;"><tr>';
        foreach ($steps as $sNum => $sLabel) {
            $isPastOrCurrent = $sNum <= $step;
            $isCurrent = $sNum === $step;

            $circleBg = $isCurrent ? '#4849E8' : ($isPastOrCurrent ? '#0F944E' : '#E8E5DF');
            $circleColor = $isPastOrCurrent ? '#FFFFFF' : '#73708A';
            $textColor = $isCurrent ? '#4849E8' : ($isPastOrCurrent ? '#0F944E' : '#73708A');
            $fontWeight = $isCurrent ? '700' : '500';

            $stepperHtml .= '
            <td align="center" style="width: 25%; vertical-align: top;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background-color: ' . $circleBg . '; color: ' . $circleColor . '; font-size: 12px; font-weight: 700; line-height: 28px; text-align: center; margin: 0 auto 6px; box-shadow: ' . ($isCurrent ? '0 0 0 4px #EEEDFC' : 'none') . ';">
                ' . ($isPastOrCurrent && !$isCurrent ? '✓' : $sNum) . '
              </div>
              <span style="font-size: 11px; font-weight: ' . $fontWeight . '; color: ' . $textColor . '; text-transform: uppercase; letter-spacing: 0.5px;">
                ' . $sLabel . '
              </span>
            </td>';
        }
        $stepperHtml .= '</tr></table>';

        // Line Items HTML with robust image handling (CID inline or stylized thumbnail)
        $linesHtml = '';
        foreach ($lines as $item) {
            $title = htmlspecialchars($item['title'] ?? 'Artisanal Candle');
            $size = htmlspecialchars($item['size'] ?? 'Standard');
            $qty = (int) ($item['qty'] ?? 1);
            $price = (float) ($item['price'] ?? 0);
            $itemTotal = $price * $qty;

            // Check if CID is attached
            $cid = $item['_cid'] ?? null;
            $imgSrc = $cid ? "cid:{$cid}" : ($item['image'] ?? '');

            $imgTag = '';
            if ($imgSrc) {
                $imgTag = '<img src="' . htmlspecialchars($imgSrc) . '" alt="" width="58" height="58" style="width: 58px; height: 58px; object-fit: cover; border-radius: 10px; border: 1px solid #E8E5DF; display: block; box-shadow: 0 2px 6px rgba(18,17,36,0.06);" />';
            } else {
                // Fallback styled candle icon thumbnail
                $imgTag = '<div style="width: 58px; height: 58px; border-radius: 10px; background-color: #EEEDFC; border: 1px solid #D2D3F8; text-align: center; line-height: 58px; font-size: 24px;">🕯️</div>';
            }

            $linesHtml .= '
            <tr>
              <td style="padding: 16px 0; border-bottom: 1px solid #E8E5DF;">
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="width: 68px; vertical-align: middle; padding-right: 14px;">
                      ' . $imgTag . '
                    </td>
                    <td style="vertical-align: middle;">
                      <p style="margin: 0; font-size: 14.5px; font-weight: 700; color: #121124; line-height: 1.35;">' . $title . '</p>
                      <div style="margin-top: 4px;">
                        <span style="display: inline-block; background-color: #FAF7F2; border: 1px solid #E8E5DF; border-radius: 4px; padding: 2px 7px; font-size: 11.5px; color: #4F4C68; font-weight: 500;">
                          ' . $size . '
                        </span>
                        <span style="display: inline-block; margin-left: 6px; font-size: 12px; color: #73708A; font-weight: 600;">
                          Qty: ' . $qty . '
                        </span>
                      </div>
                    </td>
                    <td style="vertical-align: middle; text-align: right; font-size: 15px; font-weight: 700; color: #121124; white-space: nowrap;">
                      ₹' . number_format($itemTotal, 2) . '
                    </td>
                  </tr>
                </table>
              </td>
            </tr>';
        }

        // Address formatted
        $addrParts = array_filter([
            $address['line1'] ?? '',
            $address['line2'] ?? '',
            $address['city'] ?? '',
            $address['state'] ?? '',
            $address['pin'] ?? $address['postalCode'] ?? '',
            $address['country'] ?? 'India',
        ]);
        $addressFormatted = implode(', ', array_map('htmlspecialchars', $addrParts));
        $phoneFormatted = htmlspecialchars($order['phone'] ?? $address['phone'] ?? '');

        // Payment status badge
        $pStatus = $payment['status'] ?? (($order['status'] ?? '') === 'Confirmed' ? 'Paid' : 'Pending');
        $isPayDone = $pStatus === 'Paid';
        $payBadgeColor = $isPayDone ? '#0F944E' : ($pStatus === 'Refunded' ? '#059669' : '#D97706');
        $payBadgeBg = $isPayDone ? '#E8F5E9' : ($pStatus === 'Refunded' ? '#D1FAE5' : '#FEF3C7');
        $payLabel = $isPayDone ? 'Paid Online' : ($pStatus === 'Refunded' ? 'Refunded' : 'Pending (Pay on Delivery)');

        return '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>' . htmlspecialchars($headline) . '</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F3EE; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #121124; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F3EE; padding: 36px 14px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1px solid #E8E5DF; box-shadow: 0 10px 35px rgba(18,17,36,0.08);">
          
          <!-- Top Multi-Color Brand Stripe (Royal Blue -> Forest Green -> Lime Gold) -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #4849E8 0%, #0F944E 50%, #D2E94A 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Luxury Gradient Header Bar -->
          <tr>
            <td style="background-color: #121124; padding: 32px 30px; text-align: center; background-image: radial-gradient(circle at 50% 0%, #28263D 0%, #121124 100%);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 26px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; display: inline-block;">
                      EVARANEST
                    </span>
                    <p style="margin: 6px 0 0; font-size: 10.5px; letter-spacing: 2.5px; text-transform: uppercase; color: #D2E94A; font-weight: 700;">
                      🕯️ ARTISANAL BOTANICAL CANDLES & HOME FRAGRANCES
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ' . (!$hideStepper ? '
          <!-- Interactive Order Journey Stepper -->
          <tr>
            <td style="background-color: #FAF7F2; padding: 16px 26px; border-bottom: 1px solid #E8E5DF;">
              ' . $stepperHtml . '
            </td>
          </tr>' : '') . '

          <!-- Hero Status Banner -->
          <tr>
            <td style="padding: 28px 30px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="display: inline-block; padding: 6px 14px; background-color: ' . htmlspecialchars($badgeBg) . '; border: 1px solid ' . htmlspecialchars($badgeColor) . '; border-radius: 20px;">
                      <span style="font-size: 11px; font-weight: 700; color: ' . htmlspecialchars($badgeColor) . '; text-transform: uppercase; letter-spacing: 1px;">
                        ● ' . htmlspecialchars($badge) . '
                      </span>
                    </div>

                    <h1 style="margin: 14px 0 8px; font-size: 23px; font-weight: 800; color: #121124; line-height: 1.3;">
                      ' . $headline . '
                    </h1>

                    <p style="margin: 0; font-size: 14.5px; color: #4F4C68; line-height: 1.6;">
                      ' . $subheadline . '
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ' . ($showRefundCard && !empty($refundInfo) ? '
          <!-- Refund Highlight Box -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <div style="background-color: #ECFDF5; border-radius: 14px; border: 1px solid #A7F3D0; border-left: 5px solid #059669; padding: 20px 22px;">
                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #065F46;">💸 Refund Summary</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size: 13.5px; color: #047857; padding: 3px 0;">Refund Amount:</td>
                    <td style="font-size: 18px; color: #059669; font-weight: 800; text-align: right; padding: 3px 0;">₹' . number_format((float) ($refundInfo['amount'] ?? 0), 2) . '</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #065F46; padding: 3px 0;">Reference ID:</td>
                    <td style="font-size: 13px; font-family: monospace; color: #047857; font-weight: 700; text-align: right; padding: 3px 0;">' . htmlspecialchars($refundInfo['id'] ?? '') . '</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #065F46; padding: 3px 0;">Credit Destination:</td>
                    <td style="font-size: 13px; color: #047857; font-weight: 600; text-align: right; padding: 3px 0;">' . htmlspecialchars($refundInfo['method'] ?? 'Original Source Account') . '</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #065F46; padding: 3px 0;">Processing Time:</td>
                    <td style="font-size: 13px; color: #047857; font-weight: 600; text-align: right; padding: 3px 0;">5–7 Business Days</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>' : '') . '

          ' . ($showCancelledCard ? '
          <!-- Cancellation Highlight Box -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <div style="background-color: #FEF2F2; border-radius: 14px; border: 1px solid #FECACA; border-left: 5px solid #DC2626; padding: 18px 22px;">
                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #991B1B;">⚠️ Cancellation Notice</p>
                <p style="margin: 0; font-size: 13.5px; color: #7F1D1D; line-height: 1.5;">
                  No further charges will be made. If you need any assistance, feel free to contact our support team.
                </p>
              </div>
            </td>
          </tr>' : '') . '

          ' . ($showTrackingCard && $shipment ? '
          <!-- Shipping / Courier Card with Blue Gradient Accent -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <div style="background-color: #FAF7F2; border-radius: 12px; border: 1px solid #E8E5DF; border-left: 5px solid #4849E8; padding: 18px 22px;">
                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #4F4C68;">🚚 Dispatch & Tracking Details</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size: 13.5px; color: #121124; font-weight: 600; padding: 2px 0;">Courier Partner: <span style="font-weight: 400;">' . htmlspecialchars($shipment['carrier'] ?? 'Delhivery Express') . '</span></td>
                  </tr>
                  <tr>
                    <td style="font-size: 13.5px; color: #121124; font-weight: 600; padding: 2px 0;">AWB Tracking #: <span style="font-family: monospace; font-size: 14px; color: #4849E8; font-weight: 700; background: #EEEDFC; padding: 2px 8px; border-radius: 4px;">' . htmlspecialchars($shipment['awb'] ?? 'In transit') . '</span></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>' : '') . '

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 10px 30px 25px;">
              <div style="background-color: #FFFFFF; border-radius: 14px; border: 1px solid #E8E5DF; padding: 20px 22px; box-shadow: 0 2px 10px rgba(18,17,36,0.03);">
                
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-bottom: 12px; border-bottom: 2px solid #121124;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <span style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #121124;">
                              🛍️ ORDER SUMMARY
                            </span>
                          </td>
                          <td align="right">
                            <span style="font-size: 12px; font-weight: 700; color: #4849E8; background: #EEEDFC; padding: 3px 8px; border-radius: 6px;">
                              #' . htmlspecialchars($orderId) . '
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ' . $linesHtml . '
                </table>

                <!-- Totals Breakdown Table -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 18px;">
                  <tr>
                    <td style="padding: 5px 0; font-size: 13.5px; color: #4F4C68;">Subtotal</td>
                    <td style="padding: 5px 0; font-size: 13.5px; color: #121124; text-align: right; font-weight: 600;">₹' . number_format($subtotal, 2) . '</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; font-size: 13.5px; color: #4F4C68;">Shipping Fee</td>
                    <td style="padding: 5px 0; font-size: 13.5px; text-align: right;">
                      ' . ($shipping <= 0 
                        ? '<span style="background-color: #E8F5E9; color: #0F944E; font-weight: 800; font-size: 11.5px; padding: 3px 8px; border-radius: 6px; border: 1px solid #C8E6C9;">FREE SHIPPING</span>' 
                        : '<span style="color: #121124; font-weight: 600;">₹' . number_format($shipping, 2) . '</span>') . '
                    </td>
                  </tr>
                  ' . ($discount > 0 ? '
                  <tr>
                    <td style="padding: 5px 0; font-size: 13.5px; color: #E02438;">Coupon Discount ' . (!empty($order['coupon']) ? '(' . htmlspecialchars($order['coupon']) . ')' : '') . '</td>
                    <td style="padding: 5px 0; font-size: 13.5px; color: #E02438; text-align: right; font-weight: 700;">-₹' . number_format($discount, 2) . '</td>
                  </tr>' : '') . '
                  <tr>
                    <td style="padding: 14px 0 0; font-size: 15.5px; font-weight: 800; color: #121124; border-top: 2px dashed #E8E5DF;">Total Amount</td>
                    <td style="padding: 14px 0 0; font-size: 20px; font-weight: 800; color: #4849E8; text-align: right; border-top: 2px dashed #E8E5DF;">
                      ₹' . number_format($total, 2) . '
                    </td>
                  </tr>
                </table>

              </div>
            </td>
          </tr>

          <!-- Side-by-Side Address & Payment Info Grid -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF7F2; border-radius: 14px; border: 1px solid #E8E5DF; padding: 20px;">
                <tr>
                  <td style="vertical-align: top; width: 50%; padding-right: 14px;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #4F4C68;">📍 Delivery Address</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #121124;">' . htmlspecialchars($order['customerName'] ?? $address['name'] ?? 'Customer') . '</p>
                    <p style="margin: 4px 0 0; font-size: 12.5px; color: #4F4C68; line-height: 1.5;">' . $addressFormatted . '</p>
                    ' . ($phoneFormatted ? '<p style="margin: 6px 0 0; font-size: 12.5px; color: #121124; font-weight: 600;">📞 ' . $phoneFormatted . '</p>' : '') . '
                  </td>
                  <td style="vertical-align: top; width: 50%; padding-left: 14px; border-left: 1px solid #E8E5DF;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #4F4C68;">💳 Payment Summary</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #121124;">' . htmlspecialchars($payment['method'] ?? 'COD') . '</p>
                    <div style="margin-top: 6px;">
                      <span style="display: inline-block; background-color: ' . $payBadgeBg . '; color: ' . $payBadgeColor . '; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">
                        ' . $payLabel . '
                      </span>
                    </div>
                    ' . (!empty($payment['transactionId']) && $payment['transactionId'] !== '—' ? '<p style="margin: 6px 0 0; font-size: 11px; font-family: monospace; color: #73708A;">Txn: ' . htmlspecialchars($payment['transactionId']) . '</p>' : '') . '
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ' . ($showDeliveredCare ? '
          <!-- Candle Care Guidelines -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <div style="background-color: #EEEDFC; border-radius: 14px; border: 1px solid #D2D3F8; border-left: 5px solid #4849E8; padding: 18px 22px;">
                <p style="margin: 0 0 8px; font-size: 13.5px; font-weight: 700; color: #121124;">🕯️ Tips to Enjoy Your EvaraNest Candles:</p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #4F4C68; line-height: 1.6;">
                  <li>Trim the wick to 1/4 inch before lighting each time for a clean, soot-free burn.</li>
                  <li>Allow the melt pool to reach all edges during the first burn to prevent tunneling.</li>
                  <li>Always burn within sight on a heat-resistant surface away from breezes.</li>
                </ul>
              </div>
            </td>
          </tr>' : '') . '

          <!-- Action CTA Buttons -->
          <tr>
            <td style="padding: 0 30px 32px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  ' . ($showInvoice ? '
                  <td style="padding: 0 6px;">
                    <a href="' . htmlspecialchars($invoiceUrl) . '" target="_blank" style="display: inline-block; padding: 13px 24px; background-color: #121124; color: #FFFFFF; font-size: 13.5px; font-weight: 700; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(18,17,36,0.15);">
                      📄 View Tax Invoice
                    </a>
                  </td>' : '') . '
                  ' . ($showTrackingBtn ? '
                  <td style="padding: 0 6px;">
                    <a href="' . htmlspecialchars($trackUrl) . '" target="_blank" style="display: inline-block; padding: 13px 26px; background-color: #4849E8; color: #FFFFFF; font-size: 13.5px; font-weight: 700; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px; box-shadow: 0 6px 18px rgba(72,73,232,0.35);">
                      🚚 Live Order Tracking
                    </a>
                  </td>' : '') . '
                  ' . ($showShopMoreBtn ? '
                  <td style="padding: 0 6px;">
                    <a href="' . htmlspecialchars($storeUrl) . '" target="_blank" style="display: inline-block; padding: 13px 24px; background-color: #4849E8; color: #FFFFFF; font-size: 13.5px; font-weight: 700; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px; box-shadow: 0 6px 18px rgba(72,73,232,0.35);">
                      🛍️ Shop Collections →
                    </a>
                  </td>' : '') . '
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer with Reassurance & Support -->
          <tr>
            <td style="background-color: #FAF7F2; padding: 24px 30px; text-align: center; border-top: 1px solid #E8E5DF;">
              <p style="margin: 0; font-size: 12.5px; color: #4F4C68; line-height: 1.5;">
                Need assistance with your order? Reply directly to this email or visit our store.
              </p>
              <p style="margin: 6px 0 0; font-size: 12.5px;">
                <a href="' . htmlspecialchars($storeUrl) . '" style="color: #4849E8; text-decoration: none; font-weight: 700;">Explore More Fragrances at EvaraNest Store →</a>
              </p>
              <p style="margin: 14px 0 0; font-size: 10.5px; color: #73708A; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                © ' . date('Y') . ' EvaraNest Lifestyle. Handcrafted with Care.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
    }

    /**
     * Theme-accurate OTP Verification Email Template
     */
    private static function renderOtpEmailTemplate(string $email, string $code, string $modeLabel): string
    {
        $config = app_config();
        $storeUrl = rtrim($config['storefront_url'] ?? 'http://localhost:5173', '/');

        return '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F3EE; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #121124; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F3EE; padding: 36px 14px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1px solid #E8E5DF; box-shadow: 0 10px 35px rgba(18,17,36,0.08);">
          
          <!-- Top Multi-Color Brand Stripe -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #4849E8 0%, #0F944E 50%, #D2E94A 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Bar -->
          <tr>
            <td style="background-color: #121124; padding: 26px 30px; text-align: center; background-image: radial-gradient(circle at 50% 0%, #28263D 0%, #121124 100%);">
              <span style="font-size: 24px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: #FFFFFF; display: inline-block;">
                EVARANEST
              </span>
              <p style="margin: 5px 0 0; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D2E94A; font-weight: 700;">
                ARTISANAL LUXURY & BOTANICAL FRAGRANCES
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 34px 30px; text-align: center;">
              <div style="display: inline-block; padding: 6px 16px; background-color: #EEEDFC; border: 1px solid #4849E8; border-radius: 20px; margin-bottom: 8px;">
                <span style="font-size: 11px; font-weight: 700; color: #4849E8; text-transform: uppercase; letter-spacing: 1px;">
                  🔒 ' . htmlspecialchars($modeLabel) . ' Security Code
                </span>
              </div>
              
              <h1 style="margin: 16px 0 8px; font-size: 21px; font-weight: 800; color: #121124;">
                Your Verification Code
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 14.5px; color: #4F4C68; line-height: 1.55;">
                Enter this one-time code to authenticate your account. This code is valid for <strong>5 minutes</strong>.
              </p>

              <!-- OTP Code Display Box -->
              <div style="background-color: #FAF7F2; border: 2px dashed #4849E8; border-radius: 14px; padding: 20px 28px; display: inline-block; margin: 0 auto 24px; box-shadow: 0 4px 14px rgba(72,73,232,0.08);">
                <span style="font-family: \'SF Mono\', Consolas, Monaco, monospace; font-size: 34px; font-weight: 800; letter-spacing: 9px; color: #4849E8;">
                  ' . htmlspecialchars($code) . '
                </span>
              </div>

              <p style="margin: 0; font-size: 12.5px; color: #73708A;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8E5DF;">
              <p style="margin: 0; font-size: 12.5px;">
                <a href="' . htmlspecialchars($storeUrl) . '" style="color: #4849E8; text-decoration: none; font-weight: 700;">Visit EvaraNest Store →</a>
              </p>
              <p style="margin: 10px 0 0; font-size: 10px; color: #73708A; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                © ' . date('Y') . ' EvaraNest Lifestyle. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
    }
}