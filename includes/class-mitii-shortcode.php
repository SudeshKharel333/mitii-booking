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

    $css_path = MITII_PLUGIN_DIR . 'build/public-widget.css';
    if ( file_exists( $css_path ) ) {
        wp_enqueue_style(
            'mitii-public-widget-style',
            MITII_PLUGIN_URL . 'build/public-widget.css',
            array(),
            $asset_file['version']
        );
    }
            wp_localize_script( 'mitii-public-widget', 'mitiiWidgetData', array(
            'portalUrl' => self::find_portal_page_url(),
        ) );

}

private static function find_portal_page_url() {
        $pages = get_posts( array(
            'post_type'   => 'page',
            'post_status' => 'publish',
            'numberposts' => -1,
        ) );
 
        foreach ( $pages as $page ) {
            if ( has_shortcode( $page->post_content, 'mitii_customer_portal' ) ) {
                return get_permalink( $page->ID );
            }
        }
 
        return home_url( '/' );
    }






}