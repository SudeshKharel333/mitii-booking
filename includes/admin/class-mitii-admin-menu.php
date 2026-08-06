<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Admin_Menu {

    public static function register() {
        add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
        add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_dashboard_assets' ) );
    }

    public static function add_menu() {
        // Parent menu
        add_menu_page(
            'Mitii Booking',           // Page title
            'Mitii Booking',           // Menu title
            'manage_mitii_bookings',   // Capability
            'mitii-booking',           // Menu slug
            array( __CLASS__, 'render_dashboard' ),
            'dashicons-calendar-alt',  // Icon
            26                         // Position
        );

        // Dashboard submenu
        add_submenu_page(
            'mitii-booking',
            'Dashboard',
            'Dashboard',
            'manage_mitii_bookings',
            'mitii-booking',
            array( __CLASS__, 'render_dashboard' )
        );

        // Bookings submenu
        add_submenu_page(
            'mitii-booking',
            'Bookings',
            'Bookings',
            'manage_mitii_bookings',
            'mitii-bookings',
            array( __CLASS__, 'render_bookings' )
        );

        // Services submenu
        add_submenu_page(
            'mitii-booking',
            'Services',
            'Services',
            'manage_mitii_bookings',
            'mitii-services',
            array( __CLASS__, 'render_services' )
        );

        // Staff submenu
        add_submenu_page(
            'mitii-booking',
            'Staff',
            'Staff',
            'manage_mitii_bookings',
            'mitii-staff',
            array( __CLASS__, 'render_staff' )
        );
    }

    public static function render_dashboard() {
        echo '<div class="wrap"><h1>Mitii Dashboard</h1><div id="mitii-admin-root"></div></div>';
    }

    public static function render_bookings() {
        echo '<div class="wrap"><h1>Bookings</h1></div>';
    }

    public static function render_services() {
        echo '<div class="wrap"><h1>Services</h1></div>';
    }

    public static function render_staff() {
        echo '<div class="wrap"><h1>Staff</h1></div>';
    }

    public static function enqueue_dashboard_assets( $hook ) {
        if ( $hook !== 'toplevel_page_mitii-booking' ) {
            return;
        }
        // Admin dashboard React app can be enqueued here
    }
}