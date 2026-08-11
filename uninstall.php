<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) exit;

global $wpdb;
$tables = [
    'mitii_bookings', 'mitii_services', 'mitii_staff',
    'mitii_availability', 'mitii_customers', 'mitii_customer_sessions',
    'mitii_holidays', 'mitii_staff_holidays', 'mitii_break_times',
    'mitii_staff_services',
];
foreach ( $tables as $table ) {
    $wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}{$table}" );
}

$admin_role = get_role( 'administrator' );
if ( $admin_role ) {
    $admin_role->remove_cap( 'manage_mitii_bookings' );
}