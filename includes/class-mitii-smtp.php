<?php
/**
 * Mitii SMTP Handler
 *
 * Configures WordPress to send all emails via SMTP without any plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mitii_SMTP {

	const OPTION_KEY = 'mitii_smtp_settings';

	private static function defaults() {
		return array(
			'enabled'     => false,
			'host'        => 'smtp.gmail.com',
			'port'        => 587,
			'encryption'  => 'tls',
			'username'    => '',
			'password'    => '',
			'from_email'  => '',
			'from_name'   => get_bloginfo( 'name' ) . ' Bookings',
		);
	}

	public static function get_settings() {
		$stored = get_option( self::OPTION_KEY, array() );
		return wp_parse_args( $stored, self::defaults() );
	}

	public static function init() {
		$settings = self::get_settings();

		if ( ! empty( $settings['enabled'] ) ) {
			add_action( 'phpmailer_init', array( __CLASS__, 'configure_phpmailer' ) );
		}

		if ( ! empty( $settings['from_email'] ) ) {
			add_filter( 'wp_mail_from', array( __CLASS__, 'filter_from_email' ) );
		}
		if ( ! empty( $settings['from_name'] ) ) {
			add_filter( 'wp_mail_from_name', array( __CLASS__, 'filter_from_name' ) );
		}

		add_action( 'admin_menu', array( __CLASS__, 'add_settings_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
	}

	public static function configure_phpmailer( $phpmailer ) {
		$settings = self::get_settings();

		$phpmailer->isSMTP();
		$phpmailer->Host       = sanitize_text_field( $settings['host'] );
		$phpmailer->Port       = intval( $settings['port'] );
		$phpmailer->SMTPAuth   = true;
		$phpmailer->Username   = sanitize_text_field( $settings['username'] );
		$phpmailer->Password   = $settings['password'];
		$phpmailer->SMTPSecure = sanitize_text_field( $settings['encryption'] );

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			$phpmailer->SMTPDebug   = 2;
			$phpmailer->Debugoutput = 'error_log';
		}
	}

	public static function filter_from_email( $from ) {
		$settings = self::get_settings();
		return ! empty( $settings['from_email'] ) ? sanitize_email( $settings['from_email'] ) : $from;
	}

	public static function filter_from_name( $name ) {
		$settings = self::get_settings();
		return ! empty( $settings['from_name'] ) ? sanitize_text_field( $settings['from_name'] ) : $name;
	}

	/* -------------------------------------------------------------------------
	 * Admin Settings Page
	 * ---------------------------------------------------------------------- */

	public static function add_settings_page() {
		add_submenu_page(
			'mitii-bookings', // <-- FIXED: was 'mitii-booking', now matches your actual menu slug
			__( 'SMTP Settings', 'mitii-booking' ),
			__( 'SMTP Settings', 'mitii-booking' ),
			'manage_options',
			'mitii-smtp',
			array( __CLASS__, 'render_settings_page' )
		);
	}

	public static function register_settings() {
		register_setting(
			'mitii_smtp_group',
			self::OPTION_KEY,
			array( __CLASS__, 'sanitize_settings' )
		);
	}

	public static function sanitize_settings( $input ) {
		$output = array();

		$output['enabled']    = ! empty( $input['enabled'] );
		$output['host']       = sanitize_text_field( $input['host'] ?? '' );
		$output['port']       = intval( $input['port'] ?? 587 );
		$output['encryption'] = in_array( $input['encryption'] ?? '', array( 'tls', 'ssl', 'none' ), true )
			? $input['encryption']
			: 'tls';
		$output['username']   = sanitize_text_field( $input['username'] ?? '' );
		$output['password']   = sanitize_text_field( $input['password'] ?? '' );
		$output['from_email'] = sanitize_email( $input['from_email'] ?? '' );
		$output['from_name']  = sanitize_text_field( $input['from_name'] ?? '' );

		return $output;
	}

	public static function render_settings_page() {
		$settings = self::get_settings();
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<?php if ( isset( $_GET['settings-updated'] ) ) : ?>
				<div class="notice notice-success is-dismissible">
					<p><?php esc_html_e( 'Settings saved.', 'mitii-booking' ); ?></p>
				</div>
			<?php endif; ?>

			<form method="post" action="options.php">
				<?php settings_fields( 'mitii_smtp_group' ); ?>

				<table class="form-table">
					<tr>
						<th scope="row"><?php esc_html_e( 'Enable SMTP', 'mitii-booking' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[enabled]" value="1" <?php checked( $settings['enabled'] ); ?>>
								<?php esc_html_e( 'Send all emails via SMTP', 'mitii-booking' ); ?>
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="mitii_smtp_host"><?php esc_html_e( 'SMTP Host', 'mitii-booking' ); ?></label></th>
						<td>
							<input type="text" id="mitii_smtp_host" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[host]" value="<?php echo esc_attr( $settings['host'] ); ?>" class="regular-text">
							<p class="description">
								<?php esc_html_e( 'Gmail: smtp.gmail.com | Brevo: smtp-relay.brevo.com | SendGrid: smtp.sendgrid.net', 'mitii-booking' ); ?>
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="mitii_smtp_port"><?php esc_html_e( 'SMTP Port', 'mitii-booking' ); ?></label></th>
						<td>
							<input type="number" id="mitii_smtp_port" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[port]" value="<?php echo esc_attr( $settings['port'] ); ?>" class="small-text">
							<p class="description"><?php esc_html_e( 'Common: 587 (TLS), 465 (SSL), 25 (unencrypted)', 'mitii-booking' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="mitii_smtp_encryption"><?php esc_html_e( 'Encryption', 'mitii-booking' ); ?></label></th>
						<td>
							<select id="mitii_smtp_encryption" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[encryption]">
								<option value="tls" <?php selected( $settings['encryption'], 'tls' ); ?>>TLS</option>
								<option value="ssl" <?php selected( $settings['encryption'], 'ssl' ); ?>>SSL</option>
								<option value="none" <?php selected( $settings['encryption'], 'none' ); ?>><?php esc_html_e( 'None', 'mitii-booking' ); ?></option>
							</select>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="mitii_smtp_username"><?php esc_html_e( 'Username', 'mitii-booking' ); ?></label></th>
						<td>
							<input type="text" id="mitii_smtp_username" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[username]" value="<?php echo esc_attr( $settings['username'] ); ?>" class="regular-text" autocomplete="off">
							<p class="description"><?php esc_html_e( 'Gmail: your full email address', 'mitii-booking' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="mitii_smtp_password"><?php esc_html_e( 'Password / App Password', 'mitii-booking' ); ?></label></th>
						<td>
							<input type="password" id="mitii_smtp_password" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[password]" value="<?php echo esc_attr( $settings['password'] ); ?>" class="regular-text" autocomplete="off">
							<p class="description">
								<?php esc_html_e( 'For Gmail with 2FA: use an App Password, not your regular password.', 'mitii-booking' ); ?>
								<a href="https://myaccount.google.com/apppasswords" target="_blank"><?php esc_html_e( 'Generate one here', 'mitii-booking' ); ?></a>.
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="mitii_smtp_from_email"><?php esc_html_e( 'From Email', 'mitii-booking' ); ?></label></th>
						<td>
							<input type="email" id="mitii_smtp_from_email" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[from_email]" value="<?php echo esc_attr( $settings['from_email'] ); ?>" class="regular-text">
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="mitii_smtp_from_name"><?php esc_html_e( 'From Name', 'mitii-booking' ); ?></label></th>
						<td>
							<input type="text" id="mitii_smtp_from_name" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[from_name]" value="<?php echo esc_attr( $settings['from_name'] ); ?>" class="regular-text">
						</td>
					</tr>
				</table>

				<?php submit_button(); ?>
			</form>

			<h2><?php esc_html_e( 'Send Test Email', 'mitii-booking' ); ?></h2>
			<form method="post" action="">
				<?php wp_nonce_field( 'mitii_smtp_test', 'mitii_smtp_test_nonce' ); ?>
				<table class="form-table">
					<tr>
						<th scope="row"><label for="mitii_test_email"><?php esc_html_e( 'To Address', 'mitii-booking' ); ?></label></th>
						<td>
							<input type="email" id="mitii_test_email" name="mitii_test_email" value="<?php echo esc_attr( get_option( 'admin_email' ) ); ?>" class="regular-text">
							<?php submit_button( __( 'Send Test', 'mitii-booking' ), 'secondary', 'mitii_send_test', false ); ?>
						</td>
					</tr>
				</table>
			</form>

			<?php
			if ( isset( $_POST['mitii_send_test'], $_POST['mitii_smtp_test_nonce'] ) &&
			     wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['mitii_smtp_test_nonce'] ) ), 'mitii_smtp_test' ) ) {

				$test_to = sanitize_email( wp_unslash( $_POST['mitii_test_email'] ) );
				$result  = wp_mail(
					$test_to,
					__( 'Mitii SMTP Test', 'mitii-booking' ),
					'<p>' . esc_html__( 'If you received this, your SMTP configuration is working!', 'mitii-booking' ) . '</p>',
					array( 'Content-Type: text/html; charset=UTF-8' )
				);

				echo '<div class="notice ' . ( $result ? 'notice-success' : 'notice-error' ) . ' is-dismissible">';
				echo '<p>' . ( $result
					? esc_html__( 'Test email sent successfully. Check your inbox (and spam folder).', 'mitii-booking' )
					: esc_html__( 'Failed to send test email. Check your debug.log for SMTP errors.', 'mitii-booking' )
				) . '</p>';
				echo '</div>';
			}
			?>

			<hr>
			<h3><?php esc_html_e( 'Quick Setup Guides', 'mitii-booking' ); ?></h3>
			<table class="widefat">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Provider', 'mitii-booking' ); ?></th>
						<th><?php esc_html_e( 'Host', 'mitii-booking' ); ?></th>
						<th><?php esc_html_e( 'Port', 'mitii-booking' ); ?></th>
						<th><?php esc_html_e( 'Encryption', 'mitii-booking' ); ?></th>
						<th><?php esc_html_e( 'Password', 'mitii-booking' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>Gmail</strong></td>
						<td><code>smtp.gmail.com</code></td>
						<td>587</td>
						<td>TLS</td>
						<td><a href="https://myaccount.google.com/apppasswords" target="_blank">App Password</a></td>
					</tr>
					<tr>
						<td><strong>Brevo (Free)</strong></td>
						<td><code>smtp-relay.brevo.com</code></td>
						<td>587</td>
						<td>TLS</td>
						<td>SMTP Key from Brevo dashboard</td>
					</tr>
					<tr>
						<td><strong>SendGrid</strong></td>
						<td><code>smtp.sendgrid.net</code></td>
						<td>587</td>
						<td>TLS</td>
						<td>API Key</td>
					</tr>
				</tbody>
			</table>
		</div>
		<?php
	}
}