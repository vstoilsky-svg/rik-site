<?php
declare(strict_types=1);

// Timeweb отдаёт существующие PDF через nginx в обход .htaccess.
// Только эти три прежние редакции выдаём из непубличной папки с noindex.
header('X-Robots-Tag: noindex');
header('X-Content-Type-Options: nosniff');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'HEAD'], true)) {
    header('Allow: GET, HEAD');
    http_response_code(405);
    exit;
}
$documents = [
    'catalog' => ['katalog-rik.pdf', '347C8D68BBE80092CCFA15C57C214202E9986C247F0B5573FA1E083F58561A94'],
    'central' => ['Tehlist_RIK-S,M.pdf', '0E54C5DD3D40C27048D8300E5E3BC46AC6C9715E4BC118EB477CE418830511E6'],
    'central-captioned' => ['Tehlist_RIK-S,M.captioned.pdf', 'AC020F156937BA67E7ADF7F18D9F403767BF7A5D0F85461FBFFD0B6905334FE4'],
];
$key = $_GET['document'] ?? '';
if (!is_string($key) || !isset($documents[$key])) {
    http_response_code(404);
    exit;
}
[$name, $expectedSha] = $documents[$key];
$base = realpath(dirname(__DIR__) . '/rik_app/legacy-documents');
$file = $base === false ? false : realpath($base . '/' . $name);
if ($file === false || dirname($file) !== $base || !is_file($file) || !is_readable($file)
    || strtoupper(hash_file('sha256', $file)) !== $expectedSha) {
    http_response_code(503);
    exit;
}
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $name . '"');
header('Content-Length: ' . (string) filesize($file));
header('Cache-Control: public, max-age=3600');
if ($method === 'GET') {
    readfile($file);
}
