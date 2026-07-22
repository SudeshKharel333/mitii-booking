<?php
/**
 * Plugin Name: Mitii Booking
 * Description: Appointment booking system
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'MITII_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MITII_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once MITII_PLUGIN_DIR . 'includes/admin/class-mitii-admin-menu.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-activator.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-services-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-staff-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-bookings-controller.php';

register_activation_hook( __FILE__, array( 'Mitii_Activator', 'activate' ) );
add_action( 'rest_api_init', array( 'Mitii_Services_Controller', 'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Staff_Controller', 'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Bookings_Controller', 'register_routes' ) );
add_action( 'admin_menu', array( 'Mitii_Admin_Menu', 'register' ) );
add_action( 'admin_enqueue_scripts', array( 'Mitii_Admin_Menu', 'enqueue_assets' ) );