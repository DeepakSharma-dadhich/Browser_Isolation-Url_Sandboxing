<?php

$name = htmlspecialchars($data['fullName']);

$email = htmlspecialchars($data['email']);

$phone = htmlspecialchars($data['phone']);

$project = htmlspecialchars($data['project']);

$subject = htmlspecialchars($data['subject']);

$message = nl2br(htmlspecialchars($data['message']));

$date = date("d M Y, h:i A");

?>

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>Contact Form</title>

</head>

<body
style="
margin:0;
padding:30px;
background:#edf2f7;
font-family:Arial,Helvetica,sans-serif;
">

<table
width="700"
align="center"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:14px;
overflow:hidden;
box-shadow:0 8px 25px rgba(0,0,0,.08);
">

<!-- HEADER -->

<tr>

<td
align="center"
style="
background:#0f172a;
padding:40px;
">

<img

src="cid:companylogo"

width="180"

style="display:block;">

<h1
style="
margin:25px 0 10px;
color:#ffffff;
font-size:30px;
">

New Contact Form Submission

</h1>

<p
style="
margin:0;
color:#cbd5e1;
font-size:15px;
">

A new enquiry has been submitted through your website.

</p>

</td>

</tr>

<!-- ACTION -->

<tr>

<td style="padding:30px;">

<div
style="
background:#ecfdf5;
border-left:5px solid #22c55e;
padding:20px;
border-radius:10px;
">

<b
style="
color:#15803d;
font-size:17px;
">

Action Required

</b>

<p
style="
margin-top:8px;
color:#555;
">

Please review the enquiry details and respond to the customer.

</p>

</div>

</td>

</tr>

<!-- CUSTOMER -->

<tr>

<td style="padding:0 30px;">

<h2
style="
margin-bottom:18px;
color:#111827;
">

Customer Details

</h2>

<table
width="100%"
cellpadding="14"
style="
border-collapse:collapse;
border:1px solid #e5e7eb;
">

<tr>

<td
style="
background:#f8fafc;
font-weight:bold;
width:180px;
">

Full Name

</td>

<td><?=$name?></td>

</tr>

<tr>

<td
style="
background:#f8fafc;
font-weight:bold;
">

Email

</td>

<td>

<a href="mailto:<?=$email?>">

<?=$email?>

</a>

</td>

</tr>

<tr>

<td
style="
background:#f8fafc;
font-weight:bold;
">

Phone

</td>

<td><?=$phone?></td>

</tr>

<tr>

<td
style="
background:#f8fafc;
font-weight:bold;
">

Project

</td>

<td><?=$project?></td>

</tr>

<tr>

<td
style="
background:#f8fafc;
font-weight:bold;
">

Subject

</td>

<td><?=$subject?></td>

</tr>

<tr>

<td
style="
background:#f8fafc;
font-weight:bold;
">

Submitted

</td>

<td><?=$date?></td>

</tr>

</table>

</td>

</tr>

<!-- MESSAGE -->

<tr>

<td style="padding:30px;">

<h2>

Customer Message

</h2>

<div
style="
background:#eff6ff;
border-left:5px solid #2563eb;
padding:20px;
border-radius:10px;
line-height:28px;
color:#374151;
">

<?=$message?>

</div>

</td>

</tr>

<!-- BUTTON -->

<tr>

<td
align="center"
style="
padding-bottom:40px;
">

<!-- Quick Actions -->
<tr>
  <td style="padding:0 35px 35px;">

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:20px;">

      <h3 style="margin:0 0 15px;color:#92400e;font-size:18px;">
        Quick Actions
      </h3>

      <p style="margin:0 0 20px;color:#444;line-height:1.8;">
        Choose an action to quickly contact the customer.
      </p>

      <table cellpadding="0" cellspacing="0" border="0">
        <tr>

          <!-- Reply Button -->
          <td>
            <a href="mailto:<?=$email?>?subject=Re: <?=$subject?>"
              style="
                background:#2563eb;
                color:#ffffff;
                text-decoration:none;
                padding:14px 28px;
                border-radius:6px;
                font-weight:bold;
                display:inline-block;
                font-size:15px;
              ">
              Reply Customer
            </a>
          </td>

          <td width="15"></td>

          <!-- Call Button -->
          <td>
            <a href="tel:<?=$phone?>"
              style="
                background:#16a34a;
                color:#ffffff;
                text-decoration:none;
                padding:14px 28px;
                border-radius:6px;
                font-weight:bold;
                display:inline-block;
                font-size:15px;
              ">
              Call Customer
            </a>
          </td>

        </tr>
      </table>

      <hr style="margin:25px 0;border:none;border-top:1px solid #fde68a;">

      <ul style="margin:0;padding-left:20px;color:#555;line-height:2;">
        <li>Review the project requirements.</li>
        <li>Respond within 24 hours.</li>
        <li>Schedule a follow-up discussion if required.</li>
      </ul>

    </div>

  </td>
</tr>

</td>

</tr>

<!-- FOOTER -->

<tr>

<td
align="center"
style="
background:#0f172a;
padding:35px;
">

<p
style="
color:#ffffff;
font-size:20px;
font-weight:bold;
margin:0;
">

Sandilya Infotech

</p>

<p
style="
margin-top:10px;
color:#cbd5e1;
">

This notification was automatically generated from your website.

</p>

<p
style="
margin-top:20px;
color:#94a3b8;
font-size:13px;
">

Please do not reply to this automated email.

</p>

</td>

</tr>

</table>

</body>

</html>