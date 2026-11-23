<?php
try {
    $pdo = new PDO("mysql:host=srv1836.hstgr.io;port=3306;dbname=u290025640_uniform;charset=utf8mb4", "u290025640_OnlinUniform", "admin7091", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5
    ]);
    echo "CONNECTED TO HOSTINGER!\n";
} catch (Exception $e) {
    echo "Hostinger error: " . $e->getMessage() . "\n";
}

try {
    $pdoLocal = new PDO("mysql:host=127.0.0.1;port=3306;dbname=evaranest;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "CONNECTED TO LOCALHOST MYSQL!\n";
    $cats = $pdoLocal->query("SELECT name FROM categories")->fetchAll(PDO::FETCH_COLUMN);
    echo "Local categories: " . implode(", ", $cats) . "\n";
} catch (Exception $e) {
    echo "Local error: " . $e->getMessage() . "\n";
}
