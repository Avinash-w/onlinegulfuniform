<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Stores images as files in api/uploads, named after the owning product / category slug.
 * The database only ever keeps the resulting URL, never base64 data.
 */
class ImageStore
{
    private const EXT = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'image/svg+xml' => 'svg',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov',
        'video/ogg' => 'ogv',
    ];

    public static function extFor(string $mime): ?string
    {
        return self::EXT[$mime] ?? null;
    }

    public static function slugify(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        $s = trim($s, '-');
        return substr($s, 0, 64) ?: 'image';
    }

    public static function dir(): string
    {
        $dir = dirname(__DIR__) . '/uploads';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    public static function urlFor(string $filename): string
    {
        return rtrim(app_config()['api_base_url'], '/') . '/uploads/' . $filename;
    }

    /**
     * Downscale big JPG/PNG/WEBP files in place (max width, re-encoded) so pages load fast.
     * Silently skips when GD is missing, or for gif/svg/video.
     */
    public static function optimize(string $path, int $maxWidth = 1600): void
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('getimagesize')) {
            return;
        }
        $info = @getimagesize($path);
        if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            return;
        }
        [$w, $h] = $info;
        $tooBig = $w > $maxWidth || filesize($path) > 400 * 1024;
        if (!$tooBig) {
            return;
        }
        $src = @imagecreatefromstring((string) file_get_contents($path));
        if (!$src) {
            return;
        }
        // Respect camera orientation for JPEGs.
        if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $rot = [3 => 180, 6 => -90, 8 => 90][$exif['Orientation'] ?? 0] ?? 0;
            if ($rot && function_exists('imagerotate')) {
                $rotated = imagerotate($src, $rot, 0);
                if ($rotated) {
                    $src = $rotated;
                    [$w, $h] = [imagesx($src), imagesy($src)];
                }
            }
        }
        $nw = min($w, $maxWidth);
        $nh = (int) round($h * ($nw / $w));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($info[2] !== IMAGETYPE_JPEG) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
        match ($info[2]) {
            IMAGETYPE_JPEG => imagejpeg($dst, $path, 82),
            IMAGETYPE_PNG => imagepng($dst, $path, 7),
            IMAGETYPE_WEBP => function_exists('imagewebp') ? imagewebp($dst, $path, 82) : null,
        };
    }

    /** Unique file name "<slug>-<8 hex>.<ext>". */
    public static function filename(string $slug, string $ext): string
    {
        return self::slugify($slug) . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
    }

    public static function isDataUri(mixed $v): bool
    {
        return is_string($v) && preg_match('#^data:(image|video)/[a-z0-9.+-]+;base64,#i', $v) === 1;
    }

    /** Decode a data: URI, save it as <slug>-xxxx.<ext> and return its public URL (or the input on failure). */
    public static function saveDataUri(string $dataUri, string $slug): string
    {
        if (!preg_match('#^data:([a-z0-9.+/-]+);base64,(.*)$#is', $dataUri, $m)) {
            return $dataUri;
        }
        $ext = self::extFor(strtolower($m[1]));
        $bin = base64_decode($m[2], true);
        if ($ext === null || $bin === false || $bin === '') {
            return $dataUri;
        }
        $name = self::filename($slug, $ext);
        $dest = self::dir() . '/' . $name;
        if (file_put_contents($dest, $bin) === false) {
            return $dataUri;
        }
        self::optimize($dest);
        return self::urlFor($name);
    }

    /** Replace a base64 image string with a stored file URL; other values pass through. */
    public static function normalize(mixed $value, string $slug): mixed
    {
        return self::isDataUri($value) ? self::saveDataUri($value, $slug) : $value;
    }

    /** Walk any JSON-like structure and convert every base64 image string to a stored file URL. */
    public static function normalizeDeep(mixed $value, string $slug): mixed
    {
        if (self::isDataUri($value)) {
            return self::saveDataUri($value, $slug);
        }
        if (!is_array($value)) {
            return $value;
        }
        // Prefer the record's own slug/handle when present, so nested items are named after it.
        foreach (['slug', 'handle'] as $k) {
            if (isset($value[$k]) && is_string($value[$k]) && $value[$k] !== '') {
                $slug = $value[$k];
                break;
            }
        }
        foreach ($value as $k => $v) {
            $childSlug = is_string($k) && !ctype_digit($k) ? $slug . '-' . $k : $slug;
            $value[$k] = self::normalizeDeep($v, $childSlug);
        }
        return $value;
    }
}
