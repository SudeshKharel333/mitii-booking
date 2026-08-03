<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Deactivator {
    public static function deactivate() {
        Mitii_Session_Cleanup::unschedule();
    }
}