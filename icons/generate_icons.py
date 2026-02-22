from PIL import Image, ImageDraw

RENDER_SIZE = 512


def lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def draw_thick_line(draw, x1, y1, x2, y2, width, fill):
    draw.line([(x1, y1), (x2, y2)], fill=fill, width=width)
    r = width // 2
    draw.ellipse([x1 - r, y1 - r, x1 + r, y1 + r], fill=fill)
    draw.ellipse([x2 - r, y2 - r, x2 + r, y2 + r], fill=fill)


def create_icon_hires():
    size = RENDER_SIZE
    s = size / 128.0

    blue1 = (59, 130, 246, 255)
    blue2 = (99, 102, 241, 255)
    white = (255, 255, 255, 255)

    margin = int(4 * s)
    radius = int(24 * s)

    # Gradient background
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            bg_draw.point((x, y), fill=lerp_color(blue1, blue2, t))

    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius, fill=255,
    )

    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(bg, mask=mask)
    draw = ImageDraw.Draw(result)

    # Top bar of Z
    draw_thick_line(draw, int(28*s), int(28*s), int(100*s), int(28*s), int(10*s), white)

    # Indented list items forming Z diagonal
    items = [
        (80, 44, 88, 44, 100, 44),
        (62, 58, 70, 58, 96, 58),
        (44, 72, 52, 72, 88, 72),
        (32, 86, 40, 86, 80, 86),
    ]
    dot_r = int(3 * s)
    line_w = int(5 * s)

    for dot_cx, dot_cy, lx1, ly1, lx2, ly2 in items:
        cx, cy = int(dot_cx * s), int(dot_cy * s)
        draw.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=white)
        draw_thick_line(draw, int(lx1*s), int(ly1*s), int(lx2*s), int(ly2*s), line_w, white)

    # Bottom bar of Z
    draw_thick_line(draw, int(28*s), int(100*s), int(100*s), int(100*s), int(10*s), white)

    return result


hires = create_icon_hires()

sizes = [128, 48, 16]
for size in sizes:
    img = hires.resize((size, size), Image.LANCZOS)
    filename = f'icon{size}.png'
    img.save(filename, 'PNG')
    print(f'Generated {filename} ({size}x{size})')

print('\nAll icons generated.')
