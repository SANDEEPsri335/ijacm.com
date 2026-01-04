<?php
header('Content-Type: application/json');

// Configuration
$to = 'sandeep.sri335@gmail.com';
$subject = "New Paper Submission - IJACM";

// Check method
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

// 1. Sanitize and Collect Data
$name = htmlspecialchars($_POST['name'] ?? 'Unknown');
$email = htmlspecialchars($_POST['email'] ?? 'No Email');
$paper_title = htmlspecialchars($_POST['paper_title'] ?? 'No Title');
$abstract = htmlspecialchars($_POST['abstract'] ?? 'No Abstract');
$keywords = htmlspecialchars($_POST['keywords'] ?? 'No Keywords');
$authors = htmlspecialchars($_POST['authors'] ?? 'No Authors');
$declaration_original = isset($_POST['declaration_original']) ? 'Yes' : 'No';
$declaration_terms = isset($_POST['declaration_terms']) ? 'Yes' : 'No';

// 2. Construct Email Body (HTML)
$message = "
<html>
<head>
  <title>New Paper Submission</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    h2 { color: #1a237e; border-bottom: 2px solid #ffc107; padding-bottom: 10px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #555; }
    .value { margin-top: 5px; display: block; }
  </style>
</head>
<body>
  <div class='container'>
    <h2>New Journal Submission</h2>
    <div class='field'><span class='label'>Full Name:</span> <span class='value'>$name</span></div>
    <div class='field'><span class='label'>Email:</span> <span class='value'>$email</span></div>
    <div class='field'><span class='label'>Paper Title:</span> <span class='value'>$paper_title</span></div>
    <div class='field'><span class='label'>Keywords:</span> <span class='value'>$keywords</span></div>
    <div class='field'><span class='label'>Authors:</span> <span class='value'>$authors</span></div>
    
    <div class='field'>
      <span class='label'>Abstract:</span><br>
      <div class='value' style='background:#f9f9f9; padding:10px; border-left: 3px solid #1a237e;'>
        $abstract
      </div>
    </div>

    <hr>
    <div class='field'><span class='label'>Original Work:</span> $declaration_original</div>
    <div class='field'><span class='label'>Agreed to Terms:</span> $declaration_terms</div>
  </div>
</body>
</html>
";

// 3. Handle Attachment
$attachment = null;
$filename = '';
$filetype = '';

if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] == UPLOAD_ERR_OK) {
    $file_tmp = $_FILES['attachment']['tmp_name'];
    $filename = $_FILES['attachment']['name'];
    $filetype = $_FILES['attachment']['type'];
    
    // Read file content
    $content = file_get_contents($file_tmp);
    $attachment = chunk_split(base64_encode($content));
}

// 4. Send Email
$boundary = md5(time());

// Headers
$headers = "From: $email\r\n"; // Send from submitter's email so you can reply directly
$headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

// Body
$body = "--$boundary\r\n";
$body .= "Content-Type: text/html; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$body .= $message . "\r\n";

// Attachment
if ($attachment) {
    $body .= "--$boundary\r\n";
    $body .= "Content-Type: $filetype; name=\"$filename\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n";
    $body .= "Content-Disposition: attachment; filename=\"$filename\"\r\n\r\n";
    $body .= $attachment . "\r\n";
}

$body .= "--$boundary--";

// Main Send Function
$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Email sent successfully.']);
} else {
    // Try to debug why it failed (often server config)
    echo json_encode(['success' => false, 'message' => 'Failed to send email. Check PHP mail() configuration.']);
}
?>
