/**
 * Images made for the project itself (everything in src/assets/images/ except real/, which holds credited
 * Wikimedia Commons photos, see photoCredits.ts).
 *
 * Origin: all of these are AI-generated. Each file embeds C2PA Content Credentials signed by "Google C2PA Media
 * Services" with the IPTC source type "trainedAlgorithmicMedia", i.e. they were generated with a Google generative
 * AI service while the project was built in Google AI Studio. tests/projectImages.test.ts checks that evidence
 * and fails for an undocumented or modified image. The game labels them as AI-generated concept images.
 *
 * The project owner confirmed these images may be used, provided the game's description discloses that they are
 * AI-generated (README, page description and the card detail do).
 */
export interface ProjectImage {
  file: string;
  sha256: string;
  /** True when the app bundle actually uses the file. */
  shipped: boolean;
  use: string;
}

export const PROJECT_IMAGES: ProjectImage[] = [
  {
    file: 'card_table_blueprint_1794672963714.jpg',
    sha256: '2fde1094bd192aa23bf7a57b99a37d9f32867663e0d859daa6e1d95a126930de',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'detail_mockup_ambient_stage_1794752989150.jpg',
    sha256: 'fe66b38b038f4255d00a2d0488241d78d3724cf9c6423fc5429c89a15ba0120c',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'detail_mockup_lightbox_tabs_1794752989480.jpg',
    sha256: 'dcfcc7e637815fa4de83649b92b00ae52bab7680cd05e42256dc49aa243ea7bd',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'detail_mockup_scale_spread_1794752988036.jpg',
    sha256: '0dd99aebac1ec7afc47ce3678e91c6e0624e6da5fb1774d35fab01ddc8055725',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'detail_mockup_split_dossier_1794752986110.jpg',
    sha256: '74d701bec2eefe51353d7d4cd16bbc2deed64630b79797364198378cf718c28e',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'field_guide_desk_1794678472040.jpg',
    sha256: 'bbe7c5380e524904ca77c99a89b0cdaa81cf965d2949308cafa65326d1721827',
    shipped: false,
    use: 'removed from the arena (decorative, no meaning); kept as a design exploration, not part of the app bundle',
  },
  {
    file: 'field_guide_ui_1794677507452.jpg',
    sha256: 'c3e8b13e0cacfa8d8e4efd21b33738eeb5ef061f9ff4e1bf0c87aa1b46b13ee6',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'sunny_tabletop_ui_1794677504982.jpg',
    sha256: '5ee21e9c6e079f58230f9e59f0ad0050d90e41ee915e80b9729a14ef40fa5314',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'toybox_workshop_ui_1794677507249.jpg',
    sha256: 'f5f83af3a01b5e2a9cd303fc8be9c5eb9be4eba8a75aa0f0956a0314fa4e2d27',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
  {
    file: 'turbine_floating_deepwater_1794672964828.jpg',
    sha256: '6c1e23760db2704445fdf3304b2caa8857407f59f3ebd18039ecc48df004edc4',
    shipped: true,
    use: 'concept illustration for floating cards (fallback_floating)',
  },
  {
    file: 'turbine_offshore_giant_1794672962178.jpg',
    sha256: 'caea737d2b9896fe1cbd6299ff15ba386606b423ee57426da3f31097fe8bdcd3',
    shipped: true,
    use: 'concept illustration for offshore cards (fallback_offshore)',
  },
  {
    file: 'turbine_onshore_tower_1794672962654.jpg',
    sha256: 'cd32aba304267cc2de13a1c75ca7ce4c2564cdc4ce0154a58339d26671c7ae5b',
    shipped: true,
    use: 'concept illustration for onshore cards (fallback_onshore)',
  },
  {
    file: 'wind_farm_mega_base_1794672963623.jpg',
    sha256: '1fd19ff203997053e55eb4ccc9bcd4ba5f375ede60bdeea97d93be149d0c3281',
    shipped: true,
    use: 'concept illustration for wind-farm cards (fallback_windbase)',
  },
  {
    file: 'windy_skies_ui_1794677506584.jpg',
    sha256: '26b691ca288287d1c4dbcd3d3f9b286415c9b02e38d3a499d47247d68b6210a2',
    shipped: false,
    use: 'unused design exploration (mockup); not part of the app bundle',
  },
];
