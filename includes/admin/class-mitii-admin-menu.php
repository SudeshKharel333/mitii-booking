<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Admin_Menu {

    public static function register() {
        add_menu_page(
            'Mitii Booking',
            'Mitii Booking',
            'manage_mitii_bookings',
            'mitii-dashboard',
            array( __CLASS__, 'render_dashboard_page' ),
            'dashicons-calendar-alt'
        );

        add_submenu_page(
            'mitii-dashboard',
            'Dashboard',
            'Dashboard',
            'manage_mitii_bookings',
            'mitii-dashboard',
            array( __CLASS__, 'render_dashboard_page' )
        );

        add_submenu_page(
            'mitii-dashboard',
            'Bookings',
            'Bookings',
            'manage_mitii_bookings',
            'mitii-bookings',
            array( __CLASS__, 'render_bookings_page' )
        );

        add_submenu_page(
            'mitii-dashboard',
            'Services',
            'Services',
            'manage_mitii_bookings',
            'mitii-services',
            array( __CLASS__, 'render_services_page' )
        );

        add_submenu_page(
            'mitii-dashboard',
            'Staff',
            'Staff',
            'manage_mitii_bookings',
            'mitii-staff',
            array( __CLASS__, 'render_staff_page' )
        );

        add_submenu_page(
            'mitii-dashboard',
            'Customers',
            'Customers',
            'manage_mitii_bookings',
            'mitii-customers',
            array( __CLASS__, 'render_customers_page' )
        );
    }

    public static function render_dashboard_page() {
        echo '<div id="mitii-dashboard-root"></div>';
    }

    public static function render_bookings_page() {
        echo '<div id="mitii-bookings-root"></div>';
    }

    public static function render_services_page() {
        echo '<div id="mitii-services-root"></div>';
    }

    public static function render_staff_page() {
        echo '<div id="mitii-staff-root"></div>';
    }

    public static function render_customers_page() {
        echo '<div id="mitii-customers-root"></div>';
    }

    public static function enqueue_assets( $hook ) {
        $script_map = array(
            'toplevel_page_mitii-dashboard'          => array( 'admin-dashboard', 'mitii-dashboard-root' ),
            'mitii-booking_page_mitii-bookings'      => array( 'admin-bookings', 'mitii-bookings-root' ),
            'mitii-booking_page_mitii-services'      => array( 'admin-services', 'mitii-services-root' ),
            'mitii-booking_page_mitii-staff'         => array( 'admin-staff', 'mitii-staff-root' ),
            'mitii-booking_page_mitii-customers'     => array( 'admin-customers', 'mitii-customers-root' ),
        );

        if ( ! isset( $script_map[ $hook ] ) ) {
            return;
        }

        list( $handle, $root_id ) = $script_map[ $hook ];

        // Services and Staff pages both need WordPress's built-in Media
        // Library picker, for service/staff images.
        if ( 'admin-services' === $handle || 'admin-staff' === $handle ) {
            wp_enqueue_media();
        }

        $asset_file = include MITII_PLUGIN_DIR . "build/{$handle}.asset.php";

        wp_enqueue_script(
            $handle,
            MITII_PLUGIN_URL . "build/{$handle}.js",
            $asset_file['dependencies'],
            $asset_file['version'],
            true
        );


    $css_path = MITII_PLUGIN_DIR . "build/{$handle}.css";
    if ( file_exists( $css_path ) ) {
        wp_enqueue_style(
            "{$handle}-style",
            MITII_PLUGIN_URL . "build/{$handle}.css",
            array(),
            $asset_file['version']
        );
    }



        wp_localize_script( $handle, 'mitiiAdminData', array(
            'nonce' => wp_create_nonce( 'wp_rest' ),
        ) );
    }
}