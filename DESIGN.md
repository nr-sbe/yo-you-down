# Yo, You Down? — design decisions

The product is a compact social planning tool, not a marketing site. Keep the new-plan form and recent hangouts immediately available. Shared links open the availability grid directly.

- **Direction:** night-out noticeboard. Midnight-blue panels, citrus action color, rounded Outfit typography, and consistent Phosphor icons.
- **Typography:** self-hosted variable Outfit; readable forms and tabular time labels. A small angled wordmark tile supplies character without a hero section.
- **Interactions:** one-tap hangout-name presets, clear selected cells, brief press feedback, and reduced-motion support. No scroll-dependent entrances or hidden controls.
- **Color:** semantic tokens independently defined and contrast-tested in dark and light. Dark is the first-visit default.
- **Layout:** compact asymmetric form/recent-plan split on desktop; one column on mobile. Four dates fit a typical phone grid; wider ranges scroll inside that grid.
- **Time zones:** visible native selector when making a plan; named region and IANA identifier remain visible above availability inputs.

Applied ui-ux-pro-max for accessibility, touch targets, and interaction hierarchy; design-taste-frontend for a deliberate visual direction and self-hosted typography; and gpt-taste for typography/spacing discipline. Their marketing-hero, AIDA, large-spacing, and scroll-animation suggestions are overridden by the user's explicit immediate-action and speed requirements.

Assets: Outfit from the Google Fonts repository under SIL OFL; Phosphor Icons 2.1.1 under MIT. Licenses are in assets/. No third-party font or icon calls occur at runtime.
