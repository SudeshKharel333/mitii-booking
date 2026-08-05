<?php
/**
 * Template Name: Mitii Booking (No Header/Footer)
 *
 * A bare page template — no theme header, footer, or sidebar — so the
 * booking widget, customer portal, or staff-first widget can be embedded
 * as a distraction-free, full-page experience.
 *
 * Selected from Page Attributes > Template in the block editor on any
 * page using [mitii_booking], [mitii_booking_by_staff], or
 * [mitii_customer_portal].
 */

if ( ! defined( 'ABSPATH' ) ) exit;
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php wp_title( '' ); ?></title>
	<?php wp_head(); ?>
	<style>
		html, body {
			margin: 0;
			padding: 0;
			background: #F4F3EF;
		}
		.mitii-clean-page {
			min-height: 100vh;
			display: flex;
			align-items: flex-start;
			justify-content: center;
			padding: 48px 16px;
			box-sizing: border-box;
		}
	</style>
</head>
<body <?php body_class( 'mitii-clean-body' ); ?>>
	<?php
	if ( function_exists( 'wp_body_open' ) ) {
		wp_body_open();
	}
	?>
	<div class="mitii-clean-page">
		<?php
		while ( have_posts() ) :
			the_post();
			the_content();
		endwhile;
		?>
	</div>
	<?php wp_footer(); ?>
</body>
</html>