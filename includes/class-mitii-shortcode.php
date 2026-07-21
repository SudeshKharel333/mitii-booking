<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Shortcode {

    public static function register() {
        add_shortcode( 'mitii_booking', array( __CLASS__, 'render' ) );
    }

    public static function render() {
        return '<div id="mitii-widget-root"></div>';
    }

    public static function enqueue_assets() {
        if ( ! is_singular() || ! has_shortcode( get_post()->post_content, 'mitii_booking' ) ) {
            return;
        }

        $asset_file = include MITII_PLUGIN_DIR . 'build/public-widget.asset.php';

        wp_enqueue_script(
            'mitii-public-widget',
            MITII_PLUGIN_URL . 'build/public-widget.js',
            $asset_file['dependencies'],
            $asset_file['version'],
            true
        );
    }
}