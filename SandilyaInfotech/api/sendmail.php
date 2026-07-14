<?php
header("Content-Type: application/json");

// ------------------------------------------------------------
// ---------------------- LOGGING ----------------------------
// ------------------------------------------------------------
$logFile = __DIR__ . '/mlog.txt';
function logMessage($msg) {
    global $logFile;
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $msg . "\n", FILE_APPEND);
}

// ------------------------------------------------------------
// ---------------------- CORS -------------------------------
// ------------------------------------------------------------
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");

// ------------------------------------------------------------
// ---------------------- METHOD CHECK -----------------------
// ------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method Not Allowed"]);
    exit;
}


// ------------------------------------------------------------
// ---------------------- LOAD CONFIG ------------------------
// ------------------------------------------------------------
$config = require $_SERVER['DOCUMENT_ROOT'] . '/../secure-config.php';


// ------------------------------------------------------------
// ---------------------TOKEN CHECK----------------------------
// ------------------------------------------------------------
if (!isset($_POST['token']) || $_POST['token'] !== $config['SMTP_TKN']) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    logMessage("Unauthorized token.");
    exit;
}

// ------------------------------------------------------------
// ---------------------- HELPER -----------------------------
// ------------------------------------------------------------
function respond($success, $message, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

// ------------------------------------------------------------
// ---------------------- FORM TYPE --------------------------
// ------------------------------------------------------------
$formType = $_POST['form_type'] ?? '';

// ------------------------------------------------------------
// ---------------------- VALIDATION -------------------------
// ------------------------------------------------------------
$errors = [];
$mailSubject = '';
$mailBody = '';
$userEmail = '';
$userName  = '';

// ---------------- CONTACT FORM ----------------
if ($formType === 'contact') {
    $fullName = htmlspecialchars($_POST["fullName"] ?? '');
    $phone    = htmlspecialchars($_POST["phone"] ?? '');
    $email    = htmlspecialchars($_POST["email"] ?? '');
    $project  = htmlspecialchars($_POST["project"] ?? '');
    $subject  = htmlspecialchars($_POST["subject"] ?? '');
    $message  = nl2br(htmlspecialchars($_POST["message"] ?? ''));

    // Validations
    if (!preg_match("/^[A-Za-z\s]{2,100}$/", $fullName)) $errors[] = "Invalid full name.";
    if (!preg_match("/^[0-9]{10,15}$/", $phone)) $errors[] = "Invalid phone number.";
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Invalid email.";
    // Check validation errors
    if (!empty($errors)) {
        respond(false, implode(" ", $errors), 400);
    }

    $mailSubject = "New Contact Form Submission";
    $mailBody = "
        <h3>New Contact Form Submission</h3>

    <b>Full Name:</b> $fullName <br><br>

    <b>Email:</b> $email <br><br>

    <b>Phone:</b> $phone <br><br>

    <b>Project:</b> $project <br><br>

    <b>Subject:</b> $subject <br><br>

    <b>Message:</b><br>
    $message
    ";

    $userEmail = $email;
    $userName  = $fullName;

// ---------------- CAREER FORM ----------------
} elseif ($formType === 'career') {
    $fullName    = trim($_POST['fullName'] ?? '');
    $email       = trim($_POST['email'] ?? '');
    $phone       = trim($_POST['phone'] ?? '');
    $position    = trim($_POST['position'] ?? '');
    $coverLetter = trim($_POST['coverLetter'] ?? '');
    $linkedin    = trim($_POST['linkedin'] ?? '');

    if (!preg_match("/^[A-Za-z\s]{2,100}$/", $fullName)) $errors[] = "Invalid full name.";
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Invalid email.";
    if (!preg_match("/^[0-9]{10,15}$/", $phone)) $errors[] = "Invalid phone number.";
    if (!empty($linkedin) && !filter_var($linkedin, FILTER_VALIDATE_URL)) $errors[] = "Invalid LinkedIn URL.";

    // Check resume upload
   // if (!isset($_FILES['resume']) || $_FILES['resume']['error'] !== UPLOAD_ERR_OK) {
//        $errors[] = "Resume is required.";
  //  }

    if (!empty($errors)) respond(false, implode(" ", $errors), 400);

    // Handle resume upload
    //$uploadDir = __DIR__ . "/uploads/resumes/";
    //if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    //$resumeFile = $_FILES['resume'];
    //$filename   = time() . "_" . basename($resumeFile['name']);
    //$targetPath = $uploadDir . $filename;

    //if (!move_uploaded_file($resumeFile['tmp_name'], $targetPath)) {
      //  respond(false, "Failed to upload resume.", 400);
//    }

  //  $resumeLink = "/" . str_replace($_SERVER['DOCUMENT_ROOT'], '', $targetPath);
  
  //  within $mailBody  Resume: <a href='$resumeLink'>Download Resume</a> <br>
    $mailBody = "
        Full Name: $fullName <br>
        Email: $email <br>
        Phone: $phone <br>
        Position: $position <br>
        LinkedIn: $linkedin <br>
        Cover Letter: $coverLetter <br>
    ";

    $mailSubject = "New Career Application";
    $userEmail   = $email;
    $userName    = $fullName;

// ---------------- UNKNOWN FORM ----------------
} else {
    respond(false, $formType . " Invalid form type.", 400);
}

// ------------------------------------------------------------
// ---------------------- LOAD PHPMailer ---------------------
// ------------------------------------------------------------
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . "/PHPMailer/Exception.php";
require __DIR__ . "/PHPMailer/PHPMailer.php";
require __DIR__ . "/PHPMailer/SMTP.php";

// ------------------------------------------------------------
// ---------------------- SEND EMAIL -------------------------
// ------------------------------------------------------------
try {
    // Main email to site owner
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = "smtp.hostinger.com";
    $mail->SMTPAuth   = true;
    $mail->Username   = $config["SMTP_USER"];
    $mail->Password   = $config["SMTP_PASS"];
    $mail->SMTPSecure = "ssl";
    $mail->Port       = 465;

    // $mail->setFrom($config["SMTP_USER"], $formType."Form Submission");
    // $mail->addAddress($config["SMTP_USER"]);

    // $mail->isHTML(true);
    // $mail->Subject = $mailSubject;
    // $mail->Body    = $mailBody;

    $mail->setFrom($config["SMTP_USER"], "Sandilya Infotech");
    $mail->addAddress($config["SMTP_USER"]);
    $mail->addReplyTo($userEmail, $userName);

    $mail->isHTML(true);
    $mail->Subject = $mailSubject;
    $mail->Body    = $mailBody;

    // Attach resume if career form
    if ($formType === 'career' && isset($_FILES['resume'])) {
        $mail->addAttachment($_FILES['resume']['tmp_name'], $_FILES['resume']['name']);
    }

    $mail->send();
    
    // Send confirmation email to user
    if (!empty($userEmail)) {
        $confirm = new PHPMailer(true);
        $confirm->isSMTP();
        $confirm->Host       = "smtp.hostinger.com";
        $confirm->SMTPAuth   = true;
        $confirm->Username   = $config["SMTP_USER"];
        $confirm->Password   = $config["SMTP_PASS"];
        $confirm->SMTPSecure = "ssl";
        $confirm->Port       = 465;

        $confirm->setFrom($config["SMTP_USER"], "Sandilya Infotech");
        $confirm->addAddress($userEmail, $userName);

        $confirm->isHTML(true);
        $confirm->Subject = "We received your submission";
        $confirm->Body    = "
            Dear $userName,<br><br>
            Thank you for contacting us.<br>
            We have received your form submission and our team will get back to you soon.<br><br>
            Regards,<br>
            <b>Team Sandilya</b>
        ";

        $confirm->send();
        logMessage("Confirmation email sent to $userEmail.");
    }

    respond(true, "Your form has been submitted successfully!");

} catch (Exception $e) {
    logMessage("PHPMailer error: " . $e->getMessage());
    respond(false, "Message could not be sent. Error: " . $e->getMessage(), 500);
}
