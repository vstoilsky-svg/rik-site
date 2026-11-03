<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/rik_app/lib/request.php';

foreach (['+7 (999) 123-45-67', '+79991234567'] as $phone) {
    if (!rik_valid_request_phone($phone)) {
        throw new RuntimeException('Полный номер был отклонён');
    }
}

foreach (['', '+7 (999) 12', '89991234567', '+7 (999) 123-45-678'] as $phone) {
    if (rik_valid_request_phone($phone)) {
        throw new RuntimeException('Неполный или неверный номер был принят');
    }
}

echo "Проверка телефона в PHP пройдена.\n";
