<?php
/**
 * The SiteRadar tracking snippet, added to the head of every public page so visits are counted without editing the theme.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function siteradar_snippet_enabled() {
	return 'no' !== get_option( 'siteradar_snippet', 'yes' );
}

function siteradar_print_snippet() {
	if ( ! siteradar_is_configured() || ! siteradar_snippet_enabled() || is_admin() || is_customize_preview() || is_feed() ) {
		return;
	}
	// Visits by people who can edit this website (usually its owners) are not real visitors.
	if ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) {
		return;
	}
	printf(
		"<script defer src=\"%s\" data-site=\"%s\"></script>\n",
		esc_url( trailingslashit( get_option( 'siteradar_api' ) ) . 't.js' ),
		esc_attr( get_option( 'siteradar_site_id' ) )
	);
}
