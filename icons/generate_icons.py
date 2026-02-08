from PIL import Image, ImageDraw
import os

def create_icon(size):
    """创建ChatGPT Navigator图标"""
    # 创建图像（透明背景）
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 蓝色圆形背景
    margin = size // 10
    draw.ellipse([margin, margin, size - margin, size - margin], 
                 fill=(59, 130, 246, 255))  # #3B82F6
    
    # 白色文档矩形
    doc_margin = size // 4
    doc_width = size - 2 * doc_margin
    doc_height = int(doc_width * 1.2)
    doc_top = (size - doc_height) // 2
    draw.rounded_rectangle(
        [doc_margin, doc_top, doc_margin + doc_width, doc_top + doc_height],
        radius=size // 20,
        fill=(255, 255, 255, 255)
    )
    
    # 蓝色内部矩形（代表内容区域）
    inner_margin = doc_margin + size // 20
    inner_width = doc_width - size // 10
    inner_height = doc_height - size // 10
    inner_top = doc_top + size // 20
    draw.rounded_rectangle(
        [inner_margin, inner_top, inner_margin + inner_width, inner_top + inner_height],
        radius=size // 40,
        fill=(59, 130, 246, 255)
    )
    
    # 白色列表项（代表命令）
    item_count = 5 if size >= 48 else 3
    item_margin = inner_margin + size // 30
    item_width = inner_width - size // 15
    item_height = max(2, size // 30)
    item_spacing = (inner_height - item_count * item_height) // (item_count + 1)
    
    for i in range(item_count):
        item_top = inner_top + item_spacing * (i + 1) + item_height * i
        # 交替缩进（表示层级）
        indent = size // 15 if i % 2 == 1 else 0
        draw.rounded_rectangle(
            [item_margin + indent, item_top, 
             item_margin + item_width - indent, item_top + item_height],
            radius=max(1, size // 60),
            fill=(255, 255, 255, 255)
        )
        
        # 圆点（列表标记）
        dot_radius = max(1, size // 40)
        dot_x = item_margin + indent - dot_radius - 2
        dot_y = item_top + item_height // 2
        if dot_x > inner_margin:
            draw.ellipse(
                [dot_x - dot_radius, dot_y - dot_radius,
                 dot_x + dot_radius, dot_y + dot_radius],
                fill=(255, 255, 255, 255)
            )
    
    # 搜索图标（右下角）
    if size >= 48:
        search_size = size // 5
        search_x = size - margin - search_size
        search_y = size - margin - search_size
        
        # 搜索圈
        circle_radius = search_size // 3
        circle_center_x = search_x + circle_radius
        circle_center_y = search_y + circle_radius
        draw.ellipse(
            [circle_center_x - circle_radius, circle_center_y - circle_radius,
             circle_center_x + circle_radius, circle_center_y + circle_radius],
            outline=(255, 255, 255, 255),
            width=max(2, size // 40)
        )
        
        # 搜索柄
        handle_len = search_size // 3
        handle_start_x = circle_center_x + int(circle_radius * 0.7)
        handle_start_y = circle_center_y + int(circle_radius * 0.7)
        handle_end_x = handle_start_x + handle_len
        handle_end_y = handle_start_y + handle_len
        draw.line(
            [handle_start_x, handle_start_y, handle_end_x, handle_end_y],
            fill=(255, 255, 255, 255),
            width=max(2, size // 40)
        )
    
    return img

# 生成所有尺寸
sizes = [128, 48, 16]
for size in sizes:
    img = create_icon(size)
    filename = f'icon{size}.png'
    img.save(filename, 'PNG')
    print(f'✓ 生成 {filename} ({size}x{size})')

print('\n✅ 所有图标生成完成！')
