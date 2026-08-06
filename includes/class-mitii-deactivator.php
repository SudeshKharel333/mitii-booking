<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Deactivator {
    public static function deactivate() {
        Mitii_Session_Cleanup::unschedule();

        $admin_role = get_role( 'administrator' );
        if ( $admin_role && $admin_role->has_cap( 'manage_mitii_bookings' ) ) {
            $admin_role->remove_cap( 'manage_mitii_bookings' );
        }
    }
}