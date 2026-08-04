<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Activator {
    public static function activate() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // ---- Services table ----
        $table_services = $wpdb->prefix . 'mitii_services';
        $sql_services = "CREATE TABLE $table_services (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            duration_minutes INT NOT NULL DEFAULT 30,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            image_url VARCHAR(500) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta( $sql_services );

        // ---- Staff table ----
        $table_staff = $wpdb->prefix . 'mitii_staff';
        $sql_staff = "CREATE TABLE $table_staff (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            bio TEXT,
            image_url VARCHAR(500) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta( $sql_staff );

        // ---- Availability table (which staff work which days/hours) ----
        $table_availability = $wpdb->prefix . 'mitii_availability';
        $sql_availability = "CREATE TABLE $table_availability (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            staff_id BIGINT UNSIGNED NOT NULL,
            day_of_week TINYINT NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            PRIMARY KEY (id),
            KEY staff_day (staff_id, day_of_week)
        ) $charset_collate;";
        dbDelta( $sql_availability );

        // ---- Bookings table ----
        $table_bookings = $wpdb->prefix . 'mitii_bookings';
        $sql_bookings = "CREATE TABLE $table_bookings (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            service_id BIGINT UNSIGNED NOT NULL,
            staff_id BIGINT UNSIGNED NOT NULL,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            booking_date DATE NOT NULL,
            booking_time TIME NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY staff_date (staff_id, booking_date),
            KEY customer_email (customer_email),
            KEY service_id (service_id)
        ) $charset_collate;";
        dbDelta( $sql_bookings );





// ---- Staff <-> Services junction table ----
$table_staff_services = $wpdb->prefix . 'mitii_staff_services';
$sql_staff_services = "CREATE TABLE $table_staff_services (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY staff_service_unique (staff_id, service_id),
    KEY service_id (service_id)
) $charset_collate;";
dbDelta( $sql_staff_services );



// ---- Mitii customers (separate from wp_users entirely) ----
$table_customers = $wpdb->prefix . 'mitii_customers';
$sql_customers = "CREATE TABLE $table_customers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY email_unique (email)
) $charset_collate;";
dbDelta( $sql_customers );

// ---- Active login sessions for customers ----
$table_sessions = $wpdb->prefix . 'mitii_customer_sessions';
$sql_sessions = "CREATE TABLE $table_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY token_hash_unique (token_hash)
) $charset_collate;";
dbDelta( $sql_sessions );



// ---- Register the custom customer role ----
if ( ! get_role( 'mitii_customer' ) ) {
    add_role( 'mitii_customer', 'Mitii Customer', array(
        'read' => true, // allows them to log in and view their own profile/dashboard
    ) );
}

// ---- Schedule the daily cleanup of expired customer sessions ----
Mitii_Session_Cleanup::schedule();


    }


    

}