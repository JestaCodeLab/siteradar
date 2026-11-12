<?php
/**
 * Fixes switched on in SiteRadar. SiteRadar sends the names of the fixes that should be active; this file only knows the fixed list below,
 * so nothing SiteRadar sends can ever run as code. Each fix is a few lines and is removed again the moment SiteRadar switches it off.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The fixes this plugin can apply: name => array( name, what it does ), in words for the Fixes page.
 */
function siteradar_fix_catalog() {
	return array(
		'hsts'        => array( 'HSTS', 'Browsers use only the secure address of this website for the next year.' ),
		'nosniff'     => array( 'X-Content-Type-Options header', 'Stops browsers from guessing file types.' ),
		'frame'       => array( 'X-Frame-Options header', 'Stops other websites from showing this one inside a frame (clickjacking).' ),
		'referrer'    => array( 'Referrer-Policy header', 'Stops visitors\' full page addresses being passed on to other websites.' ),
		'hide_php'    => array( 'Hide the PHP version', 'Removes the X-Powered-By header that shows the PHP version.' ),
		'viewport'    => array( 'Mobile viewport tag', 'Makes pages fit a phone screen.' ),
		'og'          => array( 'Social sharing tags', 'Adds Open Graph tags so shared links show a title, description and image. Skipped when an SEO plugin already does this.' ),
		'schema'      => array( 'Structured data', 'Adds schema.org data (organisation, website and page) that search engines read. Skipped when an SEO plugin already does this.' ),
		'canonical'   => array( 'Canonical address', 'Adds the canonical link tag to pages that lack one. Skipped when an SEO plugin already does this.' ),
		'robots'      => array( 'robots.txt', 'Serves a robots.txt that points search engines to your sitemap. Skipped when an SEO plugin or a real robots.txt file exists.' ),
		'sitemap'     => array( 'XML sitemap', 'Makes /sitemap.xml lead to the sitemap WordPress already builds. Skipped when an SEO plugin or a real sitemap.xml file exists.' ),
		'lazy'        => array( 'Lazy-load images', 'Loads images below the first screen only when a visitor scrolls to them.' ),
		'https_links' => array( 'Secure links', 'Changes http:// links to this website\'s own address into https:// so pages stop mixing secure and insecure content.' ),
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

/**
 * Is this fix switched on?
 */
function siteradar_fix_on( $name ) {
	return in_array( $name, siteradar_active_fixes(), true );
}

/**
 * The page the visitor is on, as one clean address (no page numbers or tracking parameters). Empty when there is no sensible one.
 */
function siteradar_current_url() {
	if ( is_paged() || is_404() || is_search() ) {
		return '';
	}
	if ( is_singular() ) {
		$link = get_permalink( get_queried_object_id() );
		return $link ? $link : '';
	}
	if ( is_front_page() ) {
		return home_url( '/' );
	}
	if ( is_home() ) {
		$page = (int) get_option( 'page_for_posts' );
		$link = $page ? get_permalink( $page ) : home_url( '/' );
		return $link ? $link : '';
	}
	if ( is_category() || is_tag() || is_tax() ) {
		$link = get_term_link( get_queried_object() );
		return is_wp_error( $link ) ? '' : $link;
	}
	if ( is_author() ) {
		return get_author_posts_url( get_queried_object_id() );
	}
	return '';
}

/**
 * A short description of the page: the excerpt or the start of the text, otherwise the site tagline.
 */
function siteradar_page_description() {
	if ( is_singular() ) {
		$post = get_queried_object();
		if ( $post instanceof WP_Post && ! post_password_required( $post ) ) {
			$text = has_excerpt( $post ) ? $post->post_excerpt : wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
			$text = trim( (string) preg_replace( '/\s+/', ' ', $text ) );
			if ( '' !== $text ) {
				return wp_trim_words( $text, 30, '…' );
			}
		}
	}
	return (string) get_bloginfo( 'description' );
}

/**
 * Canonical link, social sharing tags and structured data, in the head of the page. An SEO plugin does these itself, so then nothing is added.
 */
function siteradar_print_head_fixes() {
	if ( is_admin() || is_feed() || siteradar_seo_plugin() || ! siteradar_active_fixes() ) {
		return;
	}
	$url = siteradar_current_url();

	// WordPress prints the canonical tag of single pages itself, unless the theme removed it.
	if ( siteradar_fix_on( 'canonical' ) && '' !== $url && ( ! is_singular() || ! has_action( 'wp_head', 'rel_canonical' ) ) ) {
		echo '<link rel="canonical" href="' . esc_url( $url ) . '">' . "\n";
	}

	if ( siteradar_fix_on( 'og' ) ) {
		$image = '';
		if ( is_singular() && has_post_thumbnail( get_queried_object_id() ) ) {
			$image = (string) get_the_post_thumbnail_url( get_queried_object_id(), 'large' );
		}
		if ( '' === $image ) {
			$image = (string) get_site_icon_url( 512 );
		}
		$tags = array(
			'og:type'        => ( is_singular() && ! is_front_page() ) ? 'article' : 'website',
			'og:title'       => wp_get_document_title(),
			'og:description' => siteradar_page_description(),
			'og:site_name'   => get_bloginfo( 'name' ),
			'og:url'         => '' !== $url ? $url : home_url( '/' ),
			'og:image'       => $image,
			'twitter:card'   => '' !== $image ? 'summary_large_image' : 'summary',
		);
		foreach ( $tags as $name => $value ) {
			if ( '' === (string) $value ) {
				continue;
			}
			$attr = 0 === strpos( $name, 'twitter:' ) ? 'name' : 'property';
			echo '<meta ' . $attr . '="' . esc_attr( $name ) . '" content="' . esc_attr( $value ) . '">' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput
		}
	}

	if ( siteradar_fix_on( 'schema' ) ) {
		$org  = array(
			'@type' => 'Organization',
			'name'  => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			'url'   => home_url( '/' ),
		);
		$logo = get_theme_mod( 'custom_logo' ) ? wp_get_attachment_image_url( (int) get_theme_mod( 'custom_logo' ), 'full' ) : get_site_icon_url( 512 );
		if ( $logo ) {
			$org['logo'] = $logo;
		}
		$graph = array( $org );
		if ( is_front_page() ) {
			$graph[] = array(
				'@type' => 'WebSite',
				'name'  => $org['name'],
				'url'   => home_url( '/' ),
			);
		} elseif ( is_singular() ) {
			$graph[] = array(
				'@type' => 'WebPage',
				'name'  => wp_specialchars_decode( get_the_title( get_queried_object_id() ), ENT_QUOTES ),
				'url'   => $url,
			);
		}
		echo '<script type="application/ld+json">' . wp_json_encode( array( '@context' => 'https://schema.org', '@graph' => $graph ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP ) . "</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput
	}
}

/**
 * The address of the sitemap WordPress builds, or an empty string when sitemaps are off.
 */
function siteradar_sitemap_url() {
	if ( ! function_exists( 'wp_sitemaps_get_server' ) || ! apply_filters( 'wp_sitemaps_enabled', '0' !== get_option( 'blog_public' ) ) ) {
		return '';
	}
	return home_url( '/wp-sitemap.xml' );
}

/**
 * Adds the sitemap line to robots.txt.
 */
function siteradar_robots_txt( $output ) {
	$map = siteradar_sitemap_url();
	if ( '' !== $map && false === stripos( (string) $output, 'sitemap:' ) ) {
		$output = rtrim( (string) $output ) . "\n\nSitemap: " . esc_url_raw( $map ) . "\n";
	}
	return $output;
}

/**
 * robots.txt and sitemap.xml, for requests that reach WordPress when no real file answers them.
 */
function siteradar_boot_fixes() {
	if ( ! siteradar_active_fixes() || siteradar_seo_plugin() ) {
		return;
	}
	if ( siteradar_fix_on( 'robots' ) ) {
		add_filter( 'robots_txt', 'siteradar_robots_txt', 20 );
	}
	$path = isset( $_SERVER['REQUEST_URI'] ) ? wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH ) : ''; // phpcs:ignore WordPress.Security
	if ( '/robots.txt' === $path && siteradar_fix_on( 'robots' ) && ! file_exists( ABSPATH . 'robots.txt' ) ) {
		do_robots();
		exit;
	}
	if ( '/sitemap.xml' === $path && siteradar_fix_on( 'sitemap' ) && ! file_exists( ABSPATH . 'sitemap.xml' ) && '' !== siteradar_sitemap_url() ) {
		wp_safe_redirect( siteradar_sitemap_url(), 301 );
		exit;
	}
}

/**
 * Lazy-loading and secure links work on the finished page, so they also reach images and links the theme prints itself.
 */
function siteradar_start_buffer() {
	if ( ! ( siteradar_fix_on( 'lazy' ) || siteradar_fix_on( 'https_links' ) ) ) {
		return;
	}
	if ( is_admin() || is_feed() || is_embed() || is_customize_preview() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}
	ob_start( 'siteradar_filter_page' );
}

function siteradar_filter_page( $html ) {
	if ( ! is_string( $html ) || false === stripos( $html, '<html' ) ) {
		return $html;
	}
	if ( siteradar_fix_on( 'https_links' ) && is_ssl() ) {
		$host = wp_parse_url( home_url(), PHP_URL_HOST );
		if ( $host ) {
			$bare = preg_replace( '/^www\./i', '', $host );
			foreach ( array( $bare, 'www.' . $bare ) as $name ) {
				$html = str_replace( array( 'http://' . $name, 'http:\\/\\/' . $name ), array( 'https://' . $name, 'https:\\/\\/' . $name ), $html );
			}
		}
	}
	if ( siteradar_fix_on( 'lazy' ) ) {
		$seen = 0;
		// The first three images are usually on the first screen, so they load straight away. The rest wait until they are near the screen.
		$out  = preg_replace_callback(
			'/<img\b[^>]*>/i',
			static function ( $m ) use ( &$seen ) {
				++$seen;
				if ( $seen <= 3 || preg_match( '/\sloading\s*=/i', $m[0] ) ) {
					return $m[0];
				}
				return preg_replace( '/\s*\/?>$/', ' loading="lazy"$0', $m[0], 1 );
			},
			$html
		);
		$html = null === $out ? $html : $out;
	}
	return $html;
}
