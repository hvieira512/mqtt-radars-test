<?php

class HobaCareRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getStoredConfig(): array
    {
        $config = $this->db->getRow("
            SELECT hobacare_app_id, hobacare_secret, hobacare_username, hobacare_password, hobacare_base_url
            FROM configs_ucc
            LIMIT 1
        ");

        return $config ?: [
            'hobacare_app_id' => '',
            'hobacare_secret' => '',
            'hobacare_username' => '',
            'hobacare_password' => '',
            'hobacare_base_url' => '',
        ];
    }

    public function updateConfig(string $appId, string $appSecret, string $username, string $password, string $baseUrl): bool
    {
        return (bool)$this->db->autoExecute('configs_ucc', [
            'hobacare_app_id' => $appId,
            'hobacare_secret' => $appSecret,
            'hobacare_username' => $username,
            'hobacare_password' => $password,
            'hobacare_base_url' => $baseUrl,
        ], 'UPDATE', '1 = 1 LIMIT 1');
    }
}
