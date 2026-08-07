<?php
/**
 * Plugin Name: Mitii Booking
 * Description: Appointment booking system
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'MITII_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MITII_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// ── Core classes ──
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-activator.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-deactivator.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-session-cleanup.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-customer-session.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-rate-limiter.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-shortcode.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-staff-first-shortcode.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-customer-portal-shortcode.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-page-template.php';
require_once MITII_PLUGIN_DIR . 'includes/class-mitii-clean-mode.php';

// ── Admin ──
require_once MITII_PLUGIN_DIR . 'includes/admin/class-mitii-admin-menu.php';
require_once MITII_PLUGIN_DIR . 'includes/admin/class-mitii-settings-page.php';

// ── API controllers ──
require_once MITII_PLUGIN_DIR . 'includes/api/class-services-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-staff-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-availability-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-bookings-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-customer-auth-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-customers-admin-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-holidays-controller.php';
require_once MITII_PLUGIN_DIR . 'includes/api/class-schedule-extras-controller.php'; // FIX Bug 3: was loaded but never required
require_once MITII_PLUGIN_DIR . 'includes/api/class-dashboard-controller.php';       // FIX Bug 3: was loaded but never required

// ── Activation / Deactivation ──
register_activation_hook( __FILE__, array( 'Mitii_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Mitii_Deactivator', 'deactivate' ) );

// ── Hooks ──
add_action( 'rest_api_init', array( 'Mitii_Services_Controller',          'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Staff_Controller',             'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Availability_Controller',      'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Bookings_Controller',          'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Customer_Auth_Controller',     'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Holidays_Controller',          'register_routes' ) );
add_action( 'rest_api_init', array( 'Mitii_Customers_Admin_Controller',   'register_routes' ) ); // FIX Bug 3: missing hook
add_action( 'rest_api_init', array( 'Mitii_Schedule_Extras_Controller',   'register_routes' ) ); // FIX Bug 3: missing hook
add_action( 'rest_api_init', array( 'Mitii_Dashboard_Controller',         'register_routes' ) ); // FIX Bug 3: missing hook

add_action( 'admin_menu', array( 'Mitii_Admin_Menu',    'register' ) );
add_action( 'admin_menu', array( 'Mitii_Settings_Page', 'register' ) );

add_action( 'init', array( 'Mitii_Shortcode',                  'register' ) );
add_action( 'init', array( 'Mitii_Staff_First_Shortcode',      'register' ) );
add_action( 'init', array( 'Mitii_Customer_Portal_Shortcode',  'register' ) );
add_action( 'init', array( 'Mitii_Page_Template',              'register' ) );
add_action( 'init', array( 'Mitii_Clean_Mode',                 'register' ) );

add_action( 'wp_enqueue_scripts', array( 'Mitii_Shortcode',                 'enqueue_assets' ) );
add_action( 'wp_enqueue_scripts', array( 'Mitii_Staff_First_Shortcode',     'enqueue_assets' ) );
add_action( 'wp_enqueue_scripts', array( 'Mitii_Customer_Portal_Shortcode', 'enqueue_assets' ) );

add_action( Mitii_Session_Cleanup::CRON_HOOK, array( 'Mitii_Session_Cleanup', 'run_cleanup' ) );