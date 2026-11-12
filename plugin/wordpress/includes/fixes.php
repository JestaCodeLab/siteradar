<?php
/**
 * Fixes switched on in SiteRadar. SiteRadar sends the names of the fixes that should be active; this file only knows the fixed list below,
 * so nothing SiteRadar sends can ever run as code. Each fix is a few lines and is removed again the moment SiteRadar switches it off.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The fixes this plugin can apply: name => what it does, in words for the settings page.
 */
function siteradar_fix_catalog() {
	return array(
		'hsts'     => 'HSTS: browsers use only the secure address of this website',
		'nosniff'  => 'X-Content-Type-Options header',
		'frame'    => 'X-Frame-Options header (stops clickjacking)',
		'referrer' => 'Referrer-Policy header',
		'hide_php' => 'Hides the PHP version (X-Powered-By)',
		'viewport' => 'Mobile viewport tag',
	);
}

/**
 * The fixes that are active right now.
 */
function siteradar_active_fixes() {
	$saved = get_option( 'siteradar_fixes', array() );
	if ( ! is_array( $saved ) ) {
		return array();
	}
	return array_values( array_intersect( array_keys( siteradar_fix_catalog() ), $saved ) );
}

/**
 * Keep the list SiteRadar sent (only names we know). Returns true when it changed.
 */
function siteradar_store_fixes( $wanted ) {
	$wanted = is_array( $wanted ) ? array_values( array_intersect( array_keys( siteradar_fix_catalog() ), $wanted ) ) : array();
	$now    = siteradar_active_fixes();
	sort( $wanted );
	sort( $now );
	if ( $wanted === $now ) {
		return false;
	}
	update_option( 'siteradar_fixes', $wanted, false );
	return true;
}

/**
 * Headers, sent with every page of the website.
 */
function siteradar_send_fix_headers() {
	$on = siteradar_active_fixes();
	if ( ! $on || headers_sent() ) {
		return;
	}
	if ( in_array( 'hsts', $on, true ) && is_ssl() ) {
		header( 'Strict-Transport-Security: max-age=31536000' );
	}
	if ( in_array( 'nosniff', $on, true ) ) {
		header( 'X-Content-Type-Options: nosniff' );
	}
	if ( in_array( 'frame', $on, true ) ) {
		header( 'X-Frame-Options: SAMEORIGIN' );
	}
	if ( in_array( 'referrer', $on, true ) ) {
		header( 'Referrer-Policy: strict-origin-when-cross-origin' );
	}
	if ( in_array( 'hide_php', $on, true ) ) {
		header_remove( 'X-Powered-By' );
	}
}

/**
 * The mobile viewport tag, for themes that do not add it.
 */
function siteradar_print_viewport() {
	if ( in_array( 'viewport', siteradar_active_fixes(), true ) ) {
		echo '<meta name="viewport" content="width=device-width, initial-scale=1">' . "\n";
	}
}
