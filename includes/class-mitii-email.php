<?php
/**
 * Mitii Booking Email Notifications
 *
 * Handles all outgoing emails for the booking system.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mitii_Email {

	/**
	 * Send a booking confirmation email to the customer.
	 *
	 * @param int    $booking_id      The new booking ID.
	 * @param string $customer_name   Customer name.
	 * @param string $customer_email  Customer email.
	 * @param int    $service_id      Service ID.
	 * @param int    $staff_id        Staff ID.
	 * @param string $booking_date    Date (YYYY-MM-DD).
	 * @param string $booking_time    Time (HH:MM:SS).
	 */
	public static function send_customer_confirmation( $booking_id, $customer_name, $customer_email, $service_id, $staff_id, $booking_date, $booking_time ) {
		$details = self::get_booking_details( $service_id, $staff_id, $booking_date, $booking_time );

		$subject = sprintf(
			/* translators: %s: site name */
			__( 'Your appointment is confirmed — %s', 'mitii-booking' ),
			get_bloginfo( 'name' )
		);

		$body = self::get_customer_email_template( $booking_id, $customer_name, $details );

		$headers = array( 'Content-Type: text/html; charset=UTF-8' );

		wp_mail( $customer_email, $subject, $body, $headers );
	}

	/**
	 * Send a notification email to the site admin.
	 *
	 * @param int    $booking_id      The new booking ID.
	 * @param string $customer_name   Customer name.
	 * @param string $customer_email  Customer email.
	 * @param int    $service_id      Service ID.
	 * @param int    $staff_id        Staff ID.
	 * @param string $booking_date    Date (YYYY-MM-DD).
	 * @param string $booking_time    Time (HH:MM:SS).
	 */
	public static function send_admin_notification( $booking_id, $customer_name, $customer_email, $service_id, $staff_id, $booking_date, $booking_time ) {
		$details = self::get_booking_details( $service_id, $staff_id, $booking_date, $booking_time );

		$admin_email = get_option( 'admin_email' );
		$subject     = sprintf(
			/* translators: %s: booking ID */
			__( 'New booking received — #%d', 'mitii-booking' ),
			$booking_id
		);

		$body = self::get_admin_email_template( $booking_id, $customer_name, $customer_email, $details );

		$headers = array( 'Content-Type: text/html; charset=UTF-8' );

		wp_mail( $admin_email, $subject, $body, $headers );
	}

	/**
	 * Send a cancellation email to the customer.
	 *
	 * @param object $booking The booking row from the database.
	 */
	public static function send_cancellation_notice( $booking ) {
		$details = self::get_booking_details(
			$booking->service_id,
			$booking->staff_id,
			$booking->booking_date,
			$booking->booking_time
		);

		$subject = sprintf(
			__( 'Your appointment has been cancelled — %s', 'mitii-booking' ),
			get_bloginfo( 'name' )
		);

		$body = self::get_cancellation_template( $booking, $details );
		$headers = array( 'Content-Type: text/html; charset=UTF-8' );

		wp_mail( $booking->customer_email, $subject, $body, $headers );
	}

	/**
	 * Send a status update email to the customer.
	 *
	 * @param object $booking The booking row from the database.
	 * @param string $status  The new status.
	 */
	public static function send_status_update( $booking, $status ) {
		$details = self::get_booking_details(
			$booking->service_id,
			$booking->staff_id,
			$booking->booking_date,
			$booking->booking_time
		);

		$status_label = ucfirst( $status );

		$subject = sprintf(
			/* translators: %s: status label */
			__( 'Your appointment is now %s — %s', 'mitii-booking' ),
			$status_label,
			get_bloginfo( 'name' )
		);

		$body = self::get_status_update_template( $booking, $details, $status_label );
		$headers = array( 'Content-Type: text/html; charset=UTF-8' );

		wp_mail( $booking->customer_email, $subject, $body, $headers );
	}

	/* -------------------------------------------------------------------------
	 * Private helpers
	 * ---------------------------------------------------------------------- */

	/**
	 * Look up service and staff names.
	 */
	private static function get_booking_details( $service_id, $staff_id, $booking_date, $booking_time ) {
		global $wpdb;

		$services_table = $wpdb->prefix . 'mitii_services';
		$staff_table    = $wpdb->prefix . 'mitii_staff';

		$service = $wpdb->get_row( $wpdb->prepare( "SELECT name, price, duration_minutes FROM $services_table WHERE id = %d", $service_id ) );
		$staff   = $wpdb->get_row( $wpdb->prepare( "SELECT name, email FROM $staff_table WHERE id = %d", $staff_id ) );

		$formatted_date = date_i18n( get_option( 'date_format' ), strtotime( $booking_date ) );
		$formatted_time = date_i18n( get_option( 'time_format' ), strtotime( $booking_time ) );

		return array(
			'service_name'     => $service ? $service->name : __( 'Unknown Service', 'mitii-booking' ),
			'service_price'    => $service ? $service->price : '0.00',
			'service_duration' => $service ? $service->duration_minutes : 0,
			'staff_name'       => $staff ? $staff->name : __( 'Any Available Staff', 'mitii-booking' ),
			'staff_email'      => $staff ? $staff->email : '',
			'date'             => $formatted_date,
			'time'             => $formatted_time,
		);
	}

	/* -------------------------------------------------------------------------
	 * Email templates (inline CSS for maximum client compatibility)
	 * ---------------------------------------------------------------------- */

	private static function get_email_wrapper( $content ) {
	$site_name = get_bloginfo( 'name' );
	$site_url  = home_url();

	$footer_text = sprintf(
		/* translators: %s: site name with link */
		__( 'You are receiving this email because of an appointment at %s.', 'mitii-booking' ),
		'<a href="' . esc_url( $site_url ) . '" style="color:#4f46e5;text-decoration:none;">' . esc_html( $site_name ) . '</a>'
	);

	return '<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="padding:30px 30px 20px 30px;border-bottom:3px solid #4f46e5;">
            <h1 style="margin:0;font-size:22px;color:#1f2937;">' . esc_html( $site_name ) . '</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px;color:#374151;font-size:15px;line-height:1.6;">
            ' . $content . '
          </td>
        </tr>
        <tr>
          <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;font-size:12px;color:#6b7280;text-align:center;">
            ' . $footer_text . '
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>';
}

	private static function get_customer_email_template( $booking_id, $customer_name, $details ) {
		$duration_text = $details['service_duration'] > 0
			? sprintf( esc_html__( '%d minutes', 'mitii-booking' ), $details['service_duration'] )
			: esc_html__( 'N/A', 'mitii-booking' );

		$content = '
          <p style="font-size:16px;margin-top:0;">' . sprintf( esc_html__( 'Hi %s,', 'mitii-booking' ), esc_html( $customer_name ) ) . '</p>
          <p>' . esc_html__( 'Your appointment has been confirmed. Here are the details:', 'mitii-booking' ) . '</p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;background:#f9fafb;border-radius:6px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Service', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['service_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Staff', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['staff_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Date', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['date'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Time', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['time'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Duration', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $duration_text ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Booking ID', 'mitii-booking' ) . '</strong> <span style="color:#111827;">#' . esc_html( $booking_id ) . '</span></td></tr>
          </table>

          <p style="margin-bottom:0;">' . esc_html__( 'If you need to reschedule or cancel, please contact us as soon as possible.', 'mitii-booking' ) . '</p>
        ';

		return self::get_email_wrapper( $content );
	}

	private static function get_admin_email_template( $booking_id, $customer_name, $customer_email, $details ) {
		$admin_url = admin_url( 'admin.php?page=mitii-booking' );

		$content = '
          <p style="font-size:16px;margin-top:0;"><strong>' . esc_html__( 'New booking received!', 'mitii-booking' ) . '</strong></p>
          <p>' . esc_html__( 'A new appointment has been booked on your site. Details below:', 'mitii-booking' ) . '</p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;background:#f9fafb;border-radius:6px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Customer', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $customer_name ) . ' &lt;' . esc_html( $customer_email ) . '&gt;</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Service', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['service_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Staff', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['staff_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Date & Time', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['date'] ) . ' @ ' . esc_html( $details['time'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Booking ID', 'mitii-booking' ) . '</strong> <span style="color:#111827;">#' . esc_html( $booking_id ) . '</span></td></tr>
          </table>

          <p style="margin-bottom:0;"><a href="' . esc_url( $admin_url ) . '" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">' . esc_html__( 'View in Dashboard', 'mitii-booking' ) . '</a></p>
        ';

		return self::get_email_wrapper( $content );
	}

	private static function get_cancellation_template( $booking, $details ) {
		$content = '
          <p style="font-size:16px;margin-top:0;">' . sprintf( esc_html__( 'Hi %s,', 'mitii-booking' ), esc_html( $booking->customer_name ) ) . '</p>
          <p>' . esc_html__( 'Your appointment has been cancelled. Here were the details:', 'mitii-booking' ) . '</p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;background:#f9fafb;border-radius:6px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Service', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['service_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Staff', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['staff_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Date', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['date'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Time', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['time'] ) . '</span></td></tr>
          </table>

          <p style="margin-bottom:0;">' . esc_html__( 'If you did not request this cancellation, please contact us immediately.', 'mitii-booking' ) . '</p>
        ';

		return self::get_email_wrapper( $content );
	}

	private static function get_status_update_template( $booking, $details, $status_label ) {
		$content = '
          <p style="font-size:16px;margin-top:0;">' . sprintf( esc_html__( 'Hi %s,', 'mitii-booking' ), esc_html( $booking->customer_name ) ) . '</p>
          <p>' . sprintf( esc_html__( 'The status of your appointment has been updated to: %s', 'mitii-booking' ), '<strong style="color:#4f46e5;">' . esc_html( $status_label ) . '</strong>' ) . '</p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;background:#f9fafb;border-radius:6px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Service', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['service_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Staff', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['staff_name'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Date', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['date'] ) . '</span></td></tr>
            <tr><td style="padding:12px 16px;"><strong style="color:#6b7280;width:120px;display:inline-block;">' . esc_html__( 'Time', 'mitii-booking' ) . '</strong> <span style="color:#111827;">' . esc_html( $details['time'] ) . '</span></td></tr>
          </table>
        ';

		return self::get_email_wrapper( $content );
	}
}