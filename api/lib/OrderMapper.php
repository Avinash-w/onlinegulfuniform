<?php

class OrderMapper
{
    public static function orderFromRows(array $order, array $lines = [], ?array $payment = null, ?array $shipment = null, array $refunds = []): array
    {
        $address = json_decode($order['address_json'] ?? '{}', true) ?: [];
        $timeline = json_decode($order['timeline_json'] ?? '[]', true) ?: [];

        $out = [
            'id' => $order['id'],
            'userId' => $order['user_id'],
            'customerName' => $order['customer_name'],
            'email' => $order['email'],
            'phone' => $order['phone'],
            'lines' => array_map([self::class, 'line'], $lines),
            'subtotal' => (int) $order['subtotal'],
            'shipping' => (int) $order['shipping'],
            'discount' => (int) $order['discount'],
            'coupon' => $order['coupon'],
            'total' => (int) $order['total'],
            'status' => $order['status'],
            'deliveryDate' => !empty($order['delivery_date']) ? (string) $order['delivery_date'] : null,
            'placedAt' => strtotime($order['placed_at']) * 1000,
            'updatedAt' => strtotime($order['updated_at']) * 1000,
            'address' => $address,
            'timeline' => array_map(static function ($t) {
                return [
                    'at' => is_numeric($t['at'] ?? null) ? (int) $t['at'] : (strtotime((string) ($t['at'] ?? 'now')) * 1000),
                    'label' => $t['label'] ?? '',
                    'note' => $t['note'] ?? null,
                ];
            }, $timeline),
        ];

        if ($payment) {
            $out['_payment'] = self::payment($payment);
        }
        if ($shipment) {
            $out['_shipment'] = self::shipment($shipment);
        }
        if ($refunds) {
            $out['_refunds'] = array_map([self::class, 'refund'], $refunds);
        }
        return $out;
    }

    public static function line(array $l): array
    {
        return [
            'variantId' => $l['variant_id'],
            'productHandle' => $l['product_handle'],
            'title' => $l['title'],
            'image' => $l['image'],
            'size' => $l['size'],
            'color' => $l['color'],
            'sku' => $l['sku'],
            'price' => (int) $l['price'],
            'qty' => (int) $l['qty'],
            'customNote' => $l['custom_note'] ?? null,
        ];
    }

    public static function payment(array $p): array
    {
        return [
            'id' => $p['id'],
            'orderId' => $p['order_id'],
            'amount' => (int) $p['amount'],
            'method' => $p['method'],
            'status' => $p['status'],
            'transactionId' => $p['transaction_id'],
            'at' => strtotime($p['paid_at']) * 1000,
        ];
    }

    public static function refund(array $r): array
    {
        return [
            'id' => $r['id'],
            'orderId' => $r['order_id'],
            'amount' => (int) $r['amount'],
            'reason' => $r['reason'],
            'status' => $r['status'],
            'at' => strtotime($r['created_at']) * 1000,
        ];
    }

    public static function shipment(array $s): array
    {
        $checkpoints = json_decode($s['checkpoints_json'] ?? '[]', true) ?: [];
        return [
            'id' => $s['id'],
            'orderId' => $s['order_id'],
            'carrier' => $s['carrier'],
            'awb' => $s['awb'],
            'status' => $s['status'],
            'shippedAt' => strtotime($s['shipped_at']) * 1000,
            'deliveredAt' => $s['delivered_at'] ? strtotime($s['delivered_at']) * 1000 : null,
            'checkpoints' => array_map(static function ($c) {
                return [
                    'at' => is_numeric($c['at'] ?? null) ? (int) $c['at'] : (strtotime((string) ($c['at'] ?? 'now')) * 1000),
                    'label' => $c['label'] ?? '',
                    'city' => $c['city'] ?? '—',
                ];
            }, $checkpoints),
        ];
    }

    public static function coupon(array $c): array
    {
        return [
            'code' => $c['code'],
            'type' => $c['type'],
            'value' => (int) $c['value'],
            'active' => (bool) $c['active'],
            'minCart' => (int) $c['min_cart'],
        ];
    }
}
