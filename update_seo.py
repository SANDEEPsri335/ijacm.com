
import os
import re
from datetime import datetime

# Configuration
ROOT_DIR = r"c:\Users\tejan\Downloads\Journal Site"
BASE_URL = "https://ijamc.com"  # Updated to user's domain
JOURNAL_NAME = "International Journal of Advanced Computing and Mechanical Systems"
JOURNAL_ACRONYM = "IJACM"

# Keyword Groups
KEYWORDS_PRIMARY = [
    "International Journal of Advanced Computing and Mechanical Systems", "IJACM journal",
    "advanced computing research", "mechanical systems engineering", "peer-reviewed engineering journal",
    "open access engineering journal", "computational mechanics", "mechatronics research",
    "engineering publication", "scientific research journal"
]

KEYWORDS_TECHNICAL = [
    "computational fluid dynamics", "finite element analysis", "robotics and automation",
    "artificial intelligence in engineering", "machine learning applications", "smart manufacturing",
    "IoT in mechanical systems", "cyber-physical systems", "digital twin technology",
    "additive manufacturing research", "predictive maintenance", "industrial automation",
    "control systems engineering", "thermal analysis", "structural dynamics"
]

KEYWORDS_ACADEMIC = [
    "engineering research papers", "scientific publications", "academic journal indexing",
    "research paper publication", "engineering manuscript submission", "technical paper review",
    "scholarly articles", "academic conference proceedings", "research dissemination",
    "engineering innovation"
]

KEYWORDS_INDUSTRY = [
    "automotive engineering research", "aerospace engineering applications", "renewable energy systems",
    "biomechanical engineering", "manufacturing technology", "industrial engineering",
    "materials science engineering", "thermal engineering", "vibration analysis", "fluid mechanics research"
]

KEYWORDS_LONG_TAIL = [
    "how to publish in engineering journal", "submit research paper to IJACM",
    "engineering journal impact factor", "latest research in mechanical engineering",
    "computational engineering advancements"
]

# Helper to combine keywords
def get_keywords(categories):
    all_kws = []
    for cat in categories:
        all_kws.extend(cat)
    # Deduplicate and join
    return ", ".join(list(dict.fromkeys(all_kws)))

# Page Mapping Logic
def get_page_metadata(filename):
    name_lower = filename.lower()
    
    if "index" in name_lower:
        title = f"Home - {JOURNAL_NAME} ({JOURNAL_ACRONYM})"
        desc = f"Welcome to {JOURNAL_ACRONYM}, a premier open-access peer-reviewed journal publishing cutting-edge research in advanced computing, mechanical systems, and engineering innovation."
        kws = get_keywords([KEYWORDS_PRIMARY, KEYWORDS_TECHNICAL, KEYWORDS_INDUSTRY])
        priority = "1.0"
        
    elif "about" in name_lower or "aims" in name_lower or "scope" in name_lower:
        title = f"About Us & Scope - {JOURNAL_ACRONYM}"
        desc = f"Learn about {JOURNAL_ACRONYM}'s mission, aims and scope. We cover computational mechanics, AI in engineering, robotics, and more."
        kws = get_keywords([KEYWORDS_PRIMARY, KEYWORDS_TECHNICAL, KEYWORDS_ACADEMIC])
        priority = "0.8"
        
    elif "submit" in name_lower or "guidelines" in name_lower or "author" in name_lower:
        title = f"Submit Paper & Guidelines - {JOURNAL_ACRONYM}"
        desc = f"Submit your research to {JOURNAL_ACRONYM}. Read our author guidelines for publishing engineering research papers and technical manuscripts."
        kws = get_keywords([KEYWORDS_PRIMARY, KEYWORDS_ACADEMIC, KEYWORDS_LONG_TAIL])
        priority = "0.9"
        
    elif "contact" in name_lower:
        title = f"Contact Us - {JOURNAL_ACRONYM}"
        desc = f"Get in touch with the {JOURNAL_ACRONYM} editorial team for inquiries about submissions, special issues, or journal policies."
        kws = get_keywords([KEYWORDS_PRIMARY])
        priority = "0.5"
        
    elif "issue" in name_lower or "volume" in name_lower:
        title = f"Journal Issues - {JOURNAL_ACRONYM}"
        desc = f"Browse current and past issues of {JOURNAL_ACRONYM}. Explore the latest research in mechanical engineering and advanced computing."
        kws = get_keywords([KEYWORDS_PRIMARY, KEYWORDS_TECHNICAL])
        priority = "0.7"
        
    elif "editorial" in name_lower or "board" in name_lower:
        title = f"Editorial Board - {JOURNAL_ACRONYM}"
        desc = f"Meet the distinguished editorial board members of {JOURNAL_ACRONYM}, experts in computing, mechanics, and engineering systems."
        kws = get_keywords([KEYWORDS_PRIMARY, KEYWORDS_ACADEMIC])
        priority = "0.6"
        
    else:
        # Fallback for generic pages
        clean_name = filename.replace('.html', '').replace('-', ' ').title()
        title = f"{clean_name} - {JOURNAL_ACRONYM}"
        desc = f"Read {clean_name} at {JOURNAL_NAME}. Open access engineering methodology and research."
        kws = get_keywords([KEYWORDS_PRIMARY, KEYWORDS_TECHNICAL])
        priority = "0.6"
        
    return title, desc, kws, priority

def update_html_file(file_path, relative_path):
    filename = os.path.basename(file_path)
    title, desc, kws, priority = get_page_metadata(filename)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Update/Add Title
    if "<title>" in content:
        content = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", content, flags=re.DOTALL)
    else:
        content = content.replace("<head>", f"<head>\n    <title>{title}</title>")

    # 2. Update/Add Description
    meta_desc = f'<meta name="description" content="{desc}">'
    if 'name="description"' in content:
        content = re.sub(r'<meta name="description" content=".*?">', meta_desc, content, flags=re.DOTALL)
    else:
        # Try to insert after title, fallback to head
        if "</title>" in content:
            content = content.replace("</title>", f"</title>\n    {meta_desc}")
        else:
            content = content.replace("<head>", f"<head>\n    {meta_desc}")

    # 3. Update/Add Keywords
    meta_kw = f'<meta name="keywords" content="{kws}">'
    if 'name="keywords"' in content:
        content = re.sub(r'<meta name="keywords" content=".*?">', meta_kw, content, flags=re.DOTALL)
    else:
        if "</title>" in content:
            content = content.replace("</title>", f"</title>\n    {meta_kw}")
        else:
            content = content.replace("<head>", f"<head>\n    {meta_kw}")
            
    # 4. Ensure Viewport
    if 'name="viewport"' not in content:
        viewport_tag = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        if "</title>" in content:
            content = content.replace("</title>", f"</title>\n    {viewport_tag}")
        else:
            content = content.replace("<head>", f"<head>\n    {viewport_tag}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Updated: {filename}")
    return priority

def generate_sitemap(url_data):
    sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for url, priority in url_data:
        sitemap_content += '  <url>\n'
        sitemap_content += f'    <loc>{url}</loc>\n'
        sitemap_content += f'    <lastmod>{datetime.now().strftime("%Y-%m-%d")}</lastmod>\n'
        sitemap_content += '    <changefreq>monthly</changefreq>\n'
        sitemap_content += f'    <priority>{priority}</priority>\n'
        sitemap_content += '  </url>\n'
        
    sitemap_content += '</urlset>'
    
    with open(os.path.join(ROOT_DIR, "sitemap.xml"), "w", encoding='utf-8') as f:
        f.write(sitemap_content)
    print("Sitemap generated.")

def main():
    url_data = []
    
    # Walk through directory
    for subdir, dirs, files in os.walk(ROOT_DIR):
        # Determine relative path from root to build URL
        rel_dir = os.path.relpath(subdir, ROOT_DIR)
        if rel_dir == ".":
            rel_dir = ""
            
        # Skip hidden folders and components
        if any(part.startswith('.') for part in rel_dir.split(os.sep)):
            continue
        if "components" in rel_dir or "assets" in rel_dir or "css" in rel_dir or "js" in rel_dir or "brain" in rel_dir:
            continue
            
        for file in files:
            if file.endswith(".html"):
                file_path = os.path.join(subdir, file)
                priority = update_html_file(file_path, rel_dir)
                
                # Build URL
                if rel_dir:
                    url_path = f"{rel_dir}/{file}".replace("\\", "/")
                else:
                    url_path = file
                    
                full_url = f"{BASE_URL}/{url_path}"
                url_data.append((full_url, priority))
                
    generate_sitemap(url_data)

if __name__ == "__main__":
    main()
