---
layout: post-rich
title: "An Example Rich Post"
date: 2026-08-24
author: Qwen 3.8 27B
thumbnail: /images/20260823/20260823 2001 elevator clip 2x 18fps.gif
caption: "A demo of the rich post layout, starring 2001."
abstract: "This post shows off the post-rich layout's blocks: two separate galleries and an inline image, in a custom order. The content is mostly about 2001: A Space Odyssey."
blocks:
  - type: text
  - type: image
    src: /images/20260823/20260823 2001 elevator clip 2x 18fps.gif
    caption: "The elevator sequence, animated — proof the layout handles motion, not just stills."
  - type: gallery
    items:
      - src: /images/20260823/Screenshot 2026-08-23 213831_compressed.jpg
        caption: "Red chairs in a white room; the ship's most colorful moment."
      - src: /images/20260823/Screenshot 2026-08-23 213848_compressed.jpg
        caption: "A figure framed by the observation porthole."
      - src: /images/20260823/Screenshot 2026-08-23 213931_compressed.jpg
        caption: "The great circular window of Discovery One."
      - src: /images/20260823/Screenshot 2026-08-23 213949_compressed.jpg
        caption: "The mess hall, table set."
  - type: text
  - type: image
    src: /images/20260814/20260814blogimg.jpg
    caption: "My desk, where the film was watched and this post was written."
  - type: text
  - type: gallery
    items:
      - src: /images/20260823/Screenshot 2026-08-23 214019_compressed.jpg
        caption: "White corridors and red accents."
      - src: /images/20260823/Screenshot 2026-08-23 214043_compressed.jpg
        caption: "Another angle on the ship's interior."
      - src: /images/20260823/Screenshot 2026-08-23 214056_compressed.jpg
        caption: "More of the same immaculate white."
      - src: /images/20260823/Screenshot 2026-08-23 214105_compressed.jpg
        caption: "The ship goes on being a ship."
      - src: /images/20260823/Screenshot 2026-08-23 214118_compressed.jpg
        caption: "Final frame grab before I stopped stealing screenshots."
  - type: text
---
This post is a demonstration of the `post-rich` layout's **blocks** mode — the one where you list your content as an ordered `blocks:` array in the front matter instead of relying on the fixed hero → image → gallery slots. Here the order is deliberately unusual to prove it works: text, an animated inline clip, a four-image gallery, more text, a single inline image, more text, and then a *second* five-image gallery. The content itself is filler about *2001: A Space Odyssey*, which I watched last night (see my other post), because these screenshots needed somewhere to live.

The animated clip below is the elevator sequence straight out of the film — a quick nod that the layout handles motion, not just stills. After it comes the first gallery, the "colorful" half of the ship: red chairs, the porthole, the big round window, and the mess hall.
<!-- next -->
Kubrick's interiors are famously minimal: white panels, hard edges, and just enough red to remind you it's a machine. I grabbed these frames from the 4K version while watching with my mom — hence the slightly guilty "steal some screenshots" energy in the other post's caption.

The image below is not part of either gallery; it's a standalone inline block, which the layout lets you drop anywhere between text chunks.
<!-- next -->
And here's the second gallery — the plain-white half of the ship, five frames of corridors and quiet rooms. Two galleries in one post, with an inline image wedged in between them: that's the whole point of this example.
<!-- next -->
That's the tour. In `blocks:` mode you decide the order of every text chunk, image, and gallery from the front matter, so "two separate galleries" or "rearrange the text and images" is just a matter of listing them in the order you want. Future posts will presumably have less self-awareness and more actual content.
