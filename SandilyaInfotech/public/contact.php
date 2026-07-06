<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allow only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method Not Allowed"
    ]);

    exit();
}

/*
|--------------------------------------------------------------------------
| Read JSON
|--------------------------------------------------------------------------
*/

$data = json_decode(file_get_contents("php://input"), true);

$mail = new PHPMailer(true);
$mail->addEmbeddedImage(
    __DIR__ . "/../src/assets/logo.png",
    "companylogo"
);
try {

    $mail->isSMTP();

    $mail->Host = "smtp.gmail.com";

    $mail->SMTPAuth = true;

    // Replace with your Gmail
    $mail->Username = "basu22nishu@gmail.com";

    // Replace with your Gmail App Password
    $mail->Password = "ukis eeez olpo hyem";

    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

    $mail->Port = 587;

    $mail->setFrom(
        "basu22nishu@gmail.com",
        "Basu"
    );

    // Replace with the email that should receive the form
    $mail->addAddress("basu22nishu@gmail.com");

    $mail->isHTML(true);

    $mail->Subject = "New Contact Form Submission";

    ob_start();

    include __DIR__ . "/contact-email.php";

    $mail->Body = ob_get_clean();

    $mail->send();

    echo json_encode([
        "success" => true
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "message" => $mail->ErrorInfo
    ]);

}