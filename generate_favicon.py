"""
Genera un favicon.ico con un switch on/off para aplicación de domótica de persianas.
Usa PIL/Pillow para dibujar directamente sin dependencias externas.
"""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

def draw_rounded_rect(draw, bbox, radius, fill):
    """Dibuja un rectángulo con esquinas redondeadas."""
    x0, y0, x1, y1 = bbox
    # Círculos en las esquinas
    draw.ellipse([x0, y0, x0 + radius * 2, y0 + radius * 2], fill=fill)
    draw.ellipse([x1 - radius * 2, y0, x1, y0 + radius * 2], fill=fill)
    draw.ellipse([x0, y1 - radius * 2, x0 + radius * 2, y1], fill=fill)
    draw.ellipse([x1 - radius * 2, y1 - radius * 2, x1, y1], fill=fill)
    # Rectángulos de relleno
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)

def create_switch_icon(size):
    """Crea el icono de switch on/off para el tamaño dado."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size  # alias

    # --- Fondo con esquinas redondeadas ---
    bg_radius = int(s * 0.22)
    # Gradiente simulado con capas (oscuro azulado)
    bg_color = (15, 17, 28, 255)
    bg_color2 = (22, 27, 44, 255)
    draw_rounded_rect(draw, [0, 0, s - 1, s - 1], bg_radius, bg_color2)
    draw_rounded_rect(draw, [1, 1, s - 2, s - 2], bg_radius, bg_color)

    # --- Cuerpo del switch (pill shape, posición ON = verde) ---
    sw_margin_x = int(s * 0.125)    # margen horizontal
    sw_top = int(s * 0.34)          # posición vertical superior
    sw_bottom = int(s * 0.66)       # posición vertical inferior
    sw_height = sw_bottom - sw_top
    sw_radius = sw_height // 2

    # Color verde para ON
    green_dark  = (22, 163, 74, 255)   # #16a34a
    green_mid   = (34, 197, 94, 255)   # #22c55e
    green_light = (74, 222, 128, 255)  # #4ade80

    # Fondo del switch en verde (ON state)
    draw_rounded_rect(draw, [sw_margin_x, sw_top, s - sw_margin_x, sw_bottom], sw_radius, green_dark)

    # Brillo superior (franja clara semitransparente)
    highlight_h = max(2, sw_height // 3)
    highlight_img = Image.new('RGBA', (s - 2 * sw_margin_x, highlight_h), (74, 222, 128, 60))
    img.alpha_composite(highlight_img, (sw_margin_x, sw_top))

    # --- Texto "ON" en el lado izquierdo del switch ---
    # No usamos font para evitar dependencias, solo marcas visuales

    # --- Knob (círculo blanco en posición ON = lado derecho) ---
    knob_radius = int(sw_height * 0.58)
    knob_cx = s - sw_margin_x - sw_radius  # centrado en el extremo derecho (ON)
    knob_cy = (sw_top + sw_bottom) // 2

    # Sombra del knob
    shadow_offset = max(1, size // 32)
    draw.ellipse(
        [knob_cx - knob_radius + shadow_offset,
         knob_cy - knob_radius + shadow_offset,
         knob_cx + knob_radius + shadow_offset,
         knob_cy + knob_radius + shadow_offset],
        fill=(0, 0, 0, 80)
    )

    # Cara del knob (blanco/gris claro)
    knob_color = (235, 238, 245, 255)
    draw.ellipse(
        [knob_cx - knob_radius, knob_cy - knob_radius,
         knob_cx + knob_radius, knob_cy + knob_radius],
        fill=knob_color
    )

    # Brillo en el knob (cuadrante superior izquierdo)
    hl_r = max(1, knob_radius // 3)
    hl_x = knob_cx - hl_r
    hl_y = knob_cy - hl_r
    draw.ellipse([hl_x - hl_r, hl_y - hl_r, hl_x + hl_r, hl_y + hl_r],
                 fill=(255, 255, 255, 160))

    # Símbolo de power (línea vertical) en el knob
    pw_top_y = knob_cy - knob_radius // 2
    pw_bot_y = knob_cy + knob_radius // 2
    pw_lw = max(1, size // 32)
    draw.line([knob_cx, pw_top_y, knob_cx, pw_bot_y],
              fill=(22, 163, 74, 220), width=pw_lw)

    return img


def save_ico(sizes, output_path):
    """Genera el ICO con múltiples tamaños."""
    images = []
    for sz in sizes:
        icon = create_switch_icon(sz)
        images.append(icon)

    # Guardar como ICO multi-resolución
    images[0].save(
        output_path,
        format='ICO',
        sizes=[(img.width, img.height) for img in images],
        append_images=images[1:]
    )
    print("[OK] favicon.ico guardado en: " + output_path)
    print("     Tamanios incluidos: " + str([img.size for img in images]))


if __name__ == '__main__':
    output = os.path.join(os.path.dirname(__file__), 'public', 'favicon.ico')
    sizes = [16, 32, 48, 64, 128, 256]
    save_ico(sizes, output)
