<?php

class DB
{
    private $_conn = null;
    public $database = '';
    private $_last_inserted_id = 0;
    private $_debug = false;

    public function __construct(
        string $dbName = 'radar_test',
        string $dbUser = 'radar_user',
        string $dbPass = 'radar_pass',
        string $dbServer = '127.0.0.1',
        string $charset = 'utf8',
        int $dbPort = 3306
    ) {
        $this->database = $dbName;
        $this->_conn = mysqli_connect($dbServer, $dbUser, $dbPass, $dbName, $dbPort);
        if (!$this->_conn) {
            throw new RuntimeException('DB connection failed: ' . mysqli_connect_error());
        }
        mysqli_set_charset($this->_conn, $charset);
    }

    public function sanitize(string $str): string
    {
        return mysqli_real_escape_string($this->_conn, $str);
    }

    public function execute(string $query)
    {
        $r = mysqli_query($this->_conn, $query);
        if ($r && mysqli_insert_id($this->_conn)) {
            $this->_last_inserted_id = mysqli_insert_id($this->_conn);
        }
        if (!$r && $this->_debug) {
            echo "DB ERROR: " . mysqli_error($this->_conn) . "\n  Query: $query\n";
        }
        return $r;
    }

    public function getAll(string $query): array
    {
        $r = mysqli_query($this->_conn, $query);
        if (!$r) {
            if ($this->_debug) {
                echo "DB ERROR: " . mysqli_error($this->_conn) . "\n  Query: $query\n";
            }
            return [];
        }
        $rows = [];
        while ($row = mysqli_fetch_assoc($r)) {
            $rows[] = $row;
        }
        return $rows;
    }

    public function getRow(string $query): ?array
    {
        $r = mysqli_query($this->_conn, $query);
        if (!$r) {
            if ($this->_debug) {
                echo "DB ERROR: " . mysqli_error($this->_conn) . "\n  Query: $query\n";
            }
            return null;
        }
        $row = mysqli_fetch_assoc($r);
        return $row ?: null;
    }

    public function getOne(string $query)
    {
        $r = mysqli_query($this->_conn, $query);
        if (!$r) {
            if ($this->_debug) {
                echo "DB ERROR: " . mysqli_error($this->_conn) . "\n  Query: $query\n";
            }
            return null;
        }
        $row = mysqli_fetch_row($r);
        return $row ? $row[0] : null;
    }

    public function fetchRow($result): ?array
    {
        if (!$result instanceof mysqli_result) {
            return null;
        }

        $row = mysqli_fetch_assoc($result);
        return $row ?: null;
    }

    public function autoExecute(string $table, array $fields, string $type, ?string $where = null)
    {
        $type = strtoupper($type);

        if ($type === 'INSERT') {
            $cols = [];
            $vals = [];
            foreach ($fields as $k => $v) {
                $cols[] = "`$k`";
                $vals[] = is_numeric($v) && $v !== 'NULL' ? $v : "'" . $this->sanitize((string)$v) . "'";
            }
            $sql = "INSERT INTO `$table` (" . implode(',', $cols) . ') VALUES (' . implode(',', $vals) . ')';
            $r = $this->execute($sql);
            if ($r) {
                $this->_last_inserted_id = mysqli_insert_id($this->_conn);
            }
            return $r;
        }

        if ($type === 'UPDATE') {
            $sets = [];
            foreach ($fields as $k => $v) {
                if (is_array($v) && ($v[1] ?? '') === 'raw') {
                    $sets[] = "`$k` = " . $v[0];
                } elseif (is_numeric($v)) {
                    $sets[] = "`$k` = $v";
                } else {
                    $sets[] = "`$k` = '" . $this->sanitize((string)$v) . "'";
                }
            }
            $sql = "UPDATE `$table` SET " . implode(',', $sets);
            if ($where) {
                $sql .= " WHERE $where";
            }
            return $this->execute($sql);
        }

        return false;
    }

    public function getLastInsertedId(): int
    {
        return (int)$this->_last_inserted_id;
    }

    public function affectedRows(): int
    {
        return (int)mysqli_affected_rows($this->_conn);
    }

    public function getConnection()
    {
        return $this->_conn;
    }

    public function debug(bool $val = true): void
    {
        $this->_debug = $val;
    }

    public function __destruct()
    {
        if ($this->_conn) {
            mysqli_close($this->_conn);
        }
    }
}

$db = new DB(
    getenv('DB_DATABASE') ?: 'radar_test',
    getenv('DB_USERNAME') ?: 'radar_user',
    getenv('DB_PASSWORD') ?: 'radar_pass',
    getenv('DB_HOST') ?: '127.0.0.1',
    'utf8',
    (int)(getenv('DB_PORT') ?: '3306')
);
