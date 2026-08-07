<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Mitii_Settings_Page
 *
 * The Settings submenu and its asset enqueuing are now handled centrally
 * by Mitii_Admin_Menu (class-mitii-admin-menu.php) to avoid the double
 * add_action('admin_menu') bug that was preventing the menu from appearing.
 *
 * Keep this class for any future settings-specific server-side logic
 * (e.g. saving option fields via admin-post.php or options API).
 */
class Mitii_Settings_Page {

    public static function register() {
        // Intentionally empty — menu + assets handled by Mitii_Admin_Menu.
    }
}