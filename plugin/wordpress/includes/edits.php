<?php
/**
 * Text changes approved in SiteRadar: page titles, meta descriptions and image alt text. SiteRadar writes a draft, the website owner reviews and approves it,
 * and this file applies it the next time the plugin checks in. It only handles the three fields below, never overwrites alt text that is already there,
 * and reports the previous value back so a change can be undone.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Where the title and description live. An SEO plugin keeps them in its own post meta; without one the plugin stores them itself and prints them.
 * Returns null for an SEO plugin whose storage is not post meta (All in One SEO), where nothing is written.
 */
function siteradar_seo_meta_keys() {
	$map = array(
		'yoast'    => array(
			'title' => '_yoast_wpseo_title',
			'desc'  => '_yoast_wpseo_metadesc',
		),
		'rankmath' => array(
			'title' => 'rank_math_title',
			'desc'  => 'rank_math_description',
		),
		'seopress' => array(
			'title' => '_seopress_titles_title',
			'desc'  => '_seopress_titles_desc',
		),
	);
	$seo = siteradar_seo_plugin();
	if ( '' === $seo ) {
		return array(
			'title' => '_siteradar_title',
			'desc'  => '_siteradar_desc',
		);
	}
	return isset( $map[ $seo ] ) ? $map[ $seo ] : null;
}

function siteradar_same_host( $url ) {
	$a = preg_replace( '/^www\./i', '', (string) wp_parse_url( $url, PHP_URL_HOST ) );
	$b = preg_replace( '/^www\./i', '', (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
	return '' !== $a && strtolower( $a ) === strtolower( $b );
}

function siteradar_post_for_url( $url ) {
	$id = (int) url_to_postid( $url );
	if ( ! $id && '' === trim( (string) wp_parse_url( $url, PHP_URL_PATH ), '/' ) && 'page' === get_option( 'show_on_front' ) ) {
		$id = (int) get_option( 'page_on_front' );
	}
	return $id;
}

function siteradar_attachment_id( $src ) {
	$id = (int) attachment_url_to_postid( $src );
	if ( ! $id ) {
		$full = preg_replace( '/-\d+x\d+(?=\.[a-z0-9]+(\?.*)?$)/i', '', $src ); // a resized copy points to the original
		if ( $full !== $src ) {
			$id = (int) attachment_url_to_postid( $full );
		}
	}
	return $id;
}

function siteradar_fail( $message ) {
	return array(
		'ok'    => false,
		'error' => $message,
	);
}

function siteradar_apply_text_edit( $edit ) {
	$field = $edit['field'];
	$keys  = siteradar_seo_meta_keys();
	if ( null === $keys ) {
		return siteradar_fail( 'All in One SEO is active. Set this text in that plugin.' );
	}
	$post_id = siteradar_post_for_url( $edit['url'] );
	if ( ! $post_id ) {
		return siteradar_fail( 'Could not find this page in WordPress.' );
	}
	$key  = $keys[ $field ];
	$prev = (string) get_post_meta( $post_id, $key, true );
	if ( ! empty( $edit['revert'] ) ) {
		$was = isset( $edit['previous'] ) ? sanitize_text_field( (string) $edit['previous'] ) : '';
		if ( '' === $was ) {
			delete_post_meta( $post_id, $key );
		} else {
			update_post_meta( $post_id, $key, wp_slash( $was ) );
		}
		return array( 'ok' => true );
	}
	$text = mb_substr( sanitize_text_field( isset( $edit['text'] ) ? (string) $edit['text'] : '' ), 0, 'desc' === $field ? 320 : 120 );
	if ( '' === $text ) {
		return siteradar_fail( 'There was no text to apply.' );
	}
	update_post_meta( $post_id, $key, wp_slash( $text ) );
	return array(
		'ok'       => true,
		'previous' => $prev,
	);
}

function siteradar_apply_alt_edit( $edit ) {
	$alts    = isset( $edit['alts'] ) && is_array( $edit['alts'] ) ? array_slice( $edit['alts'], 0, 10 ) : array();
	$applied = array();
	foreach ( $alts as $a ) {
		$src = isset( $a['src'] ) ? esc_url_raw( (string) $a['src'] ) : '';
		$id  = '' !== $src ? siteradar_attachment_id( $src ) : 0;
		if ( ! $id ) {
			continue;
		}
		$text    = mb_substr( sanitize_text_field( isset( $a['alt'] ) ? (string) $a['alt'] : '' ), 0, 200 );
		$current = trim( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) );
		if ( ! empty( $edit['revert'] ) ) {
			if ( '' !== $text && $current === $text ) { // only take back what was set here
				delete_post_meta( $id, '_wp_attachment_image_alt' );
				$applied[] = array(
					'src' => $src,
					'alt' => $text,
				);
			}
			continue;
		}
		if ( '' === $text || '' !== $current ) { // never overwrite alt text someone wrote
			continue;
		}
		update_post_meta( $id, '_wp_attachment_image_alt', wp_slash( $text ) );
		$applied[] = array(
			'src' => $src,
			'alt' => $text,
		);
	}
	if ( ! $applied && empty( $edit['revert'] ) ) {
		return siteradar_fail( 'None of these images are in the media library, or they already have alt text.' );
	}
	return array(
		'ok'           => true,
		'applied_alts' => $applied,
	);
}

/**
 * Apply the changes SiteRadar sent. Returns one result per change, for SiteRadar to record.
 */
function siteradar_apply_edits( $edits ) {
	$results = array();
	foreach ( array_slice( (array) $edits, 0, 20 ) as $edit ) {
		if ( ! is_array( $edit ) || empty( $edit['id'] ) || empty( $edit['field'] ) || empty( $edit['url'] ) ) {
			continue;
		}
		if ( ! siteradar_same_host( (string) $edit['url'] ) ) {
			$r = siteradar_fail( 'That page is not on this website.' );
		} elseif ( 'alt' === $edit['field'] ) {
			$r = siteradar_apply_alt_edit( $edit );
		} elseif ( in_array( $edit['field'], array( 'title', 'desc' ), true ) ) {
			$r = siteradar_apply_text_edit( $edit );
		} else {
			$r = siteradar_fail( 'Unknown change.' );
		}
		$r['id']   = (string) $edit['id'];
		$results[] = $r;
	}
	return $results;
}

/**
 * Without an SEO plugin, print what was stored: the title through the document title and the description as a tag.
 */
function siteradar_own_title( $title ) {
	if ( is_singular() && '' === siteradar_seo_plugin() ) {
		$mine = (string) get_post_meta( get_queried_object_id(), '_siteradar_title', true );
		if ( '' !== $mine ) {
			return $mine;
		}
	}
	return $title;
}

function siteradar_print_own_description() {
	if ( is_singular() && '' === siteradar_seo_plugin() ) {
		$mine = (string) get_post_meta( get_queried_object_id(), '_siteradar_desc', true );
		if ( '' !== $mine ) {
			echo '<meta name="description" content="' . esc_attr( $mine ) . '">' . "\n";
		}
	}
}
