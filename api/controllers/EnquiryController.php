<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';

class EnquiryController
{
    private static bool $tableChecked = false;

    public static function ensureTable(): void
    {
        if (self::$tableChecked) {
            return;
        }
        $sql = "CREATE TABLE IF NOT EXISTS custom_enquiries (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            phone VARCHAR(40) NOT NULL,
            email VARCHAR(190) NULL,
            occasion VARCHAR(160) NOT NULL,
            quantity VARCHAR(80) NOT NULL,
            message TEXT NULL,
            status ENUM('New', 'Contacted', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'New',
            notes TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_enq_status (status),
            INDEX idx_enq_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        try {
            db()->exec($sql);
            self::$tableChecked = true;
        } catch (Throwable $e) {
            error_log('[EnquiryController ensureTable] ' . $e->getMessage());
        }
    }

    public static function create(): void
    {
        self::ensureTable();
        $body = request_json();

        $errors = Validator::requireFields($body, ['name', 'phone']);
        $name = trim((string) ($body['name'] ?? ''));
        $phone = trim((string) ($body['phone'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $occasion = trim((string) ($body['occasion'] ?? 'Custom Request'));
        $quantity = trim((string) ($body['quantity'] ?? '11 – 50 pcs'));
        $message = trim((string) ($body['message'] ?? ''));

        if ($email !== '' && ($err = Validator::email($email))) {
            $errors['email'] = $err;
        }

        if ($errors) {
            Response::validation($errors);
        }

        $id = 'ENQ-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $stmt = db()->prepare(
            'INSERT INTO custom_enquiries (id, name, phone, email, occasion, quantity, message, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([
            $id,
            $name,
            $phone,
            $email ?: null,
            $occasion,
            $quantity,
            $message ?: null,
            'New',
        ]);

        // Attempt to send email notification to admin
        self::sendEmailNotification([
            'id' => $id,
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'occasion' => $occasion,
            'quantity' => $quantity,
            'message' => $message,
            'date' => date('d M Y, h:i A'),
        ]);

        Response::ok([
            'id' => $id,
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'occasion' => $occasion,
            'quantity' => $quantity,
            'message' => $message,
            'status' => 'New',
        ], 'Enquiry submitted successfully and notification sent.');
    }

    public static function index(): void
    {
        self::ensureTable();
        $includeDeleted = !empty($_GET['include_deleted']);
        $sql = 'SELECT * FROM custom_enquiries ' . ($includeDeleted ? '' : 'WHERE deleted_at IS NULL ') . 'ORDER BY created_at DESC LIMIT 300';
        $rows = db()->query($sql)->fetchAll();

        // Calculate counts
        $counts = [
            'total' => count($rows),
            'new' => 0,
            'contacted' => 0,
            'in_progress' => 0,
            'completed' => 0,
            'cancelled' => 0,
        ];

        foreach ($rows as $row) {
            $st = strtolower(str_replace(' ', '_', (string)$row['status']));
            if (isset($counts[$st])) {
                $counts[$st]++;
            }
        }

        Response::ok([
            'enquiries' => $rows,
            'metrics' => $counts,
        ]);
    }

    public static function update($paramsOrId): void
    {
        self::ensureTable();
        $id = is_array($paramsOrId) ? ($paramsOrId['id'] ?? '') : (string) $paramsOrId;
        if (!$id) {
            Response::error('Enquiry ID is required.', 400);
        }

        $body = request_json();
        $fields = [];
        $params = [];

        if (isset($body['status'])) {
            $allowed = ['New', 'Contacted', 'In Progress', 'Completed', 'Cancelled'];
            if (in_array($body['status'], $allowed, true)) {
                $fields[] = 'status = ?';
                $params[] = $body['status'];
            }
        }

        if (isset($body['notes'])) {
            $fields[] = 'notes = ?';
            $params[] = (string) $body['notes'];
        }

        if (!$fields) {
            Response::error('No update parameters provided.', 400);
        }

        $params[] = $id;
        $sql = 'UPDATE custom_enquiries SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?';
        $stmt = db()->prepare($sql);
        $stmt->execute($params);

        $stmtFetch = db()->prepare('SELECT * FROM custom_enquiries WHERE id = ? LIMIT 1');
        $stmtFetch->execute([$id]);
        $row = $stmtFetch->fetch();

        if (!$row) {
            Response::error('Enquiry not found.', 404);
        }

        Response::ok($row, 'Enquiry updated successfully.');
    }

    public static function delete($paramsOrId): void
    {
        self::ensureTable();
        $id = is_array($paramsOrId) ? ($paramsOrId['id'] ?? '') : (string) $paramsOrId;
        if (!$id) {
            Response::error('Enquiry ID is required.', 400);
        }

        $stmt = db()->prepare('UPDATE custom_enquiries SET deleted_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);

        Response::ok(['id' => $id], 'Enquiry archived successfully.');
    }

    public static function restore($paramsOrId): void
    {
        self::ensureTable();
        $id = is_array($paramsOrId) ? ($paramsOrId['id'] ?? '') : (string) $paramsOrId;
        if (!$id) {
            Response::error('Enquiry ID is required.', 400);
        }

        $stmt = db()->prepare('UPDATE custom_enquiries SET deleted_at = NULL WHERE id = ?');
        $stmt->execute([$id]);

        $stmtFetch = db()->prepare('SELECT * FROM custom_enquiries WHERE id = ? LIMIT 1');
        $stmtFetch->execute([$id]);
        $row = $stmtFetch->fetch();

        Response::ok($row ?: ['id' => $id], 'Enquiry restored successfully.');
    }

    private static function sendEmailNotification(array $data): void
    {
        try {
            // Admin target email
            $adminEmail = 'hello@evaranest.in';
            
            // Check if email in settings
            try {
                $stmt = db()->query("SELECT `value` FROM settings WHERE `key` = 'admin_email' LIMIT 1");
                $val = $stmt->fetchColumn();
                if ($val && filter_var($val, FILTER_VALIDATE_EMAIL)) {
                    $adminEmail = $val;
                }
            } catch (Throwable $_) {}

            $subject = "✨ New Custom Order Enquiry [{$data['id']}] - {$data['name']}";

            $htmlContent = "
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset='utf-8'>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f7f6f2; margin: 0; padding: 24px; color: #1e1e24; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
                .header { background-color: #4849E8; color: #ffffff; padding: 24px 30px; text-align: center; }
                .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
                .header p { margin: 0; font-size: 13px; opacity: 0.9; }
                .content { padding: 30px; }
                .badge { display: inline-block; padding: 4px 10px; background-color: #edf2f7; color: #4849E8; font-weight: 600; font-size: 12px; border-radius: 6px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid #f0eee9; }
                td.label { width: 38%; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
                td.value { color: #1e293b; font-weight: 500; }
                .message-box { background-color: #faf9f6; border-left: 4px solid #4849E8; padding: 16px; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
                .actions { text-align: center; margin: 30px 0 10px 0; }
                .btn { display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-right: 10px; }
                .footer { background-color: #f8fafc; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class='container'>
                <div class='header'>
                  <h1>EvaraNest Custom Enquiry</h1>
                  <p>A new bespoke/bulk product inquiry has been received</p>
                </div>
                <div class='content'>
                  <div class='badge'>Enquiry ID: {$data['id']}</div>
                  
                  <table>
                    <tr>
                      <td class='label'>Customer Name</td>
                      <td class='value'><strong>{$data['name']}</strong></td>
                    </tr>
                    <tr>
                      <td class='label'>WhatsApp / Phone</td>
                      <td class='value'><a href='tel:{$data['phone']}'>{$data['phone']}</a></td>
                    </tr>
                    <tr>
                      <td class='label'>Email Address</td>
                      <td class='value'>" . ($data['email'] ? "<a href='mailto:{$data['email']}'>{$data['email']}</a>" : 'Not provided') . "</td>
                    </tr>
                    <tr>
                      <td class='label'>Occasion / Event</td>
                      <td class='value'><strong>{$data['occasion']}</strong></td>
                    </tr>
                    <tr>
                      <td class='label'>Estimated Quantity</td>
                      <td class='value'>{$data['quantity']}</td>
                    </tr>
                    <tr>
                      <td class='label'>Received At</td>
                      <td class='value'>{$data['date']}</td>
                    </tr>
                  </table>

                  " . ($data['message'] ? "
                  <div style='font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 8px;'>Customer Requirement / Notes:</div>
                  <div class='message-box'>{$data['message']}</div>
                  " : "") . "

                  <div class='actions'>
                    <a class='btn' href='https://api.whatsapp.com/send?phone=" . preg_replace('/[^0-9]/', '', $data['phone']) . "&text=" . urlencode("Hi {$data['name']}, thank you for your enquiry with EvaraNest regarding {$data['occasion']}.") . "' target='_blank'>
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>
                <div class='footer'>
                  EvaraNest Candles & Home Fragrance Atelier — Automated Notification
                </div>
              </div>
            </body>
            </html>
            ";

            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=utf-8',
                'From: EvaraNest <no-reply@evaranest.in>',
            ];
            if (!empty($data['email'])) {
                $headers[] = 'Reply-To: ' . $data['email'];
            }

            @mail($adminEmail, $subject, $htmlContent, implode("\r\n", $headers));

            // Also send confirmation to customer if email is provided
            if (!empty($data['email'])) {
                $custSubject = "We received your custom enquiry — EvaraNest";
                $custBody = "
                <!DOCTYPE html>
                <html>
                <body style='font-family: Arial, sans-serif; background: #faf8f5; padding: 20px; color: #222;'>
                  <div style='max-width: 540px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 10px; border: 1px solid #eae6de;'>
                    <h2 style='color: #4849E8; margin-top: 0;'>Thank You, {$data['name']}!</h2>
                    <p>We have received your custom order request for <strong>{$data['occasion']}</strong> ({$data['quantity']}).</p>
                    <p>Our team is reviewing your requirements and will reach out to you on WhatsApp / email shortly with tailored details and pricing.</p>
                    <p style='margin-top: 25px; font-size: 13px; color: #777;'>Warm regards,<br><strong>Team EvaraNest</strong><br>Handmade with care</p>
                  </div>
                </body>
                </html>";
                $custHeaders = [
                    'MIME-Version: 1.0',
                    'Content-type: text/html; charset=utf-8',
                    'From: EvaraNest <hello@evaranest.in>',
                ];
                @mail($data['email'], $custSubject, $custBody, implode("\r\n", $custHeaders));
            }
        } catch (Throwable $e) {
            error_log('[EnquiryController sendEmailNotification] ' . $e->getMessage());
        }
    }
}
