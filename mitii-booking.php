<?php
/**
 * Plugin Name: Mitii Booking
 * Description: Appointment booking system
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'MITII_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MITII_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once MITII_PLUGIN_DIR . 'includes/class-mitii-activator.php';

register_activation_hook( __FILE__, array( 'Mitii_Activator', 'activate' ) );