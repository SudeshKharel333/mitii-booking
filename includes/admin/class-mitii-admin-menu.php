<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Admin_Menu {

    public static function register() {
        add_menu_page(
            'Mitii Booking',
            'Mitii Booking',
            'manage_options',
            'mitii-booking',
            array( __CLASS__, 'render_page' )
        );
    }

    public static function render_page() {
        echo '<div id="mitii-admin-root"></div>';
    }

    public static function enqueue_assets( $hook ) {
        if ( $hook !== 'toplevel_page_mitii-booking' ) {
            return;
        }

        $asset_file = include MITII_PLUGIN_DIR . 'build/admin/index.asset.php';

        wp_enqueue_script(
            'mitii-admin',
            MITII_PLUGIN_URL . 'build/admin/index.js',
            $asset_file['dependencies'],
            $asset_file['version'],
            true
        );
    }
}