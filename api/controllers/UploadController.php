<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/ImageStore.php';

class UploadController
{
    public static function upload(): void
    {
        Auth::requireUser();

        if (empty($_FILES['file'])) {
            Response::validation(['file' => 'Please choose a file to upload.']);
        }

        $file = $_FILES['file'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('Upload failed. Please check file size or try again.', 400);
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        
        $allowed = [
            // Images
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/svg+xml' => 'svg',
            // Videos
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            'video/quicktime' => 'mov',
            'video/ogg' => 'ogv',
        ];

        if (!isset($allowed[$mime])) {
            Response::validation(['file' => 'Only JPG, PNG, WEBP, GIF images or MP4, WEBM, MOV videos are allowed.']);
        }

        $isVideo = str_starts_with($mime, 'video/');
        $maxBytes = $isVideo ? 35 * 1024 * 1024 : 10 * 1024 * 1024; // 35MB for video, 10MB for image

        if (($file['size'] ?? 0) > $maxBytes) {
            Response::validation(['file' => $isVideo ? 'Video must be 35MB or smaller.' : 'Image must be 10MB or smaller.']);
        }

        // File is named after the product / category slug it belongs to.
        $slug = trim((string) ($_POST['slug'] ?? ''));
        if ($slug === '') {
            $slug = pathinfo((string) ($file['name'] ?? ''), PATHINFO_FILENAME);
        }

        $name = ImageStore::filename($slug, $allowed[$mime]);
        $dest = ImageStore::dir() . '/' . $name;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::error('Unable to save the uploaded file.', 500);
        }

        ImageStore::optimize($dest);

        $url = ImageStore::urlFor($name);
        Response::ok(['url' => $url, 'path' => '/uploads/' . $name, 'filename' => $name, 'isVideo' => $isVideo], 'File uploaded successfully.', 201);
    }
}
