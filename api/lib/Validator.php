<?php

class Validator
{
    public static function requireFields(array $data, array $fields): array
    {
        $errors = [];
        foreach ($fields as $field) {
            if (!array_key_exists($field, $data) || $data[$field] === null || $data[$field] === '') {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }
        return $errors;
    }

    public static function positiveNumber($value, string $field = 'value'): ?string
    {
        if (!is_numeric($value) || (float) $value < 0) {
            return ucfirst($field) . ' must be a non-negative number.';
        }
        return null;
    }

    public static function integer($value, string $field = 'value'): ?string
    {
        if (!is_numeric($value) || (int) $value != $value) {
            return ucfirst($field) . ' must be an integer.';
        }
        return null;
    }

    public static function email(string $email): ?string
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return 'Enter a valid email address.';
        }
        return null;
    }

    public static function slug(string $slug): ?string
    {
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            return 'Slug must be lowercase letters, numbers, and hyphens.';
        }
        return null;
    }
}
