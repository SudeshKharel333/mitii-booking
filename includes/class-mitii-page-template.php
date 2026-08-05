<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Registers "Mitii Booking (No Header/Footer)" as a selectable page template,
 * so any page can drop the active theme's header/footer for a clean,
 * full-page booking experience.
 */
class Mitii_Page_Template {

    const SLUG = 'mitii-no-header-footer.php';

    public static function register() {
        add_filter( 'theme_page_templates', array( __CLASS__, 'add_to_dropdown' ) );
        add_filter( 'template_include', array( __CLASS__, 'load_template' ) );
    }

    public static function add_to_dropdown( $page_templates ) {
        $page_templates[ self::SLUG ] = 'Mitii Booking (No Header/Footer)';
        return $page_templates;
    }

    public static function load_template( $template ) {
        if ( ! is_page() ) {
            return $template;
        }

        $selected = get_page_template_slug( get_the_ID() );
        if ( self::SLUG !== $selected ) {
            return $template;
        }

        $custom_template = MITII_PLUGIN_DIR . 'templates/' . self::SLUG;
        if ( file_exists( $custom_template ) ) {
            return $custom_template;
        }

        return $template;
    }
}