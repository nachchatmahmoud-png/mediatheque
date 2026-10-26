"""Refresh the latest regular landscape upload from the official ministry channel."""
import argparse
import json
import os
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = 'UCIKc_HXIZnAmfO9ulxf80EQ'
CHANNEL_URL = 'https://www.youtube.com/@Matnuhpv'
VIDEOS_URL = CHANNEL_URL + '/videos'
FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('Date non valide')
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if date.tzinfo is None:
        raise ValueError('Date sans fuseau horaire')
    return date.astimezone(timezone.utc)


def record(value):
    if not isinstance(value, dict) or value.get('version') != 1:
        raise ValueError('Fiche vidéo non valide')
    if value.get('channelId') != CHANNEL_ID or value.get('channelUrl') != CHANNEL_URL:
        raise ValueError('La vidéo ne provient pas de la chaîne attendue')
    if not isinstance(value.get('videoId'), str) or not re.fullmatch(r'[\w-]{11}', value['videoId'], re.ASCII):
        raise ValueError('Identifiant vidéo non valide')
    title = value.get('title')
    if not isinstance(title, str) or not title.strip() or len(title) > 500:
        raise ValueError('Titre vidéo non valide')
    result = {'version': 1, 'channelId': CHANNEL_ID, 'channelUrl': CHANNEL_URL,
              'videoId': value['videoId'], 'title': title.strip(), 'publishedAt': timestamp(value['publishedAt']).isoformat()}
    width, height = value.get('width'), value.get('height')
    if isinstance(width, int) and isinstance(height, int) and 0 < height < width <= 16384:
        result.update(width=width, height=height, format='landscape')
    if value.get('thumbnailUrl') == '/images/youtube-' + value['videoId'] + '.jpg':
        result['thumbnailUrl'] = value['thumbnailUrl']
    return result


def feed_videos(data, now=None):
    if len(data) > 1024 * 1024:
        raise ValueError('Flux trop volumineux')
    feed = ET.fromstring(data)
    now = now or datetime.now(timezone.utc)
    videos = []
    for entry in feed.findall('a:entry', NS):
        if entry.findtext('yt:channelId', namespaces=NS) != CHANNEL_ID:
            continue
        candidate = record({'version': 1, 'channelId': CHANNEL_ID, 'channelUrl': CHANNEL_URL,
                            'videoId': entry.findtext('yt:videoId', namespaces=NS),
                            'title': entry.findtext('a:title', namespaces=NS),
                            'publishedAt': entry.findtext('a:published', namespaces=NS)})
        if timestamp(candidate['publishedAt']) <= now:
            videos.append(candidate)
    if not videos:
        raise ValueError('Aucune vidéo publiée dans le flux')
    return sorted(videos, key=lambda video: timestamp(video['publishedAt']), reverse=True)


def initial_json(data, name):
    page = data.decode('utf-8')
    match = re.search(r'(?:var\s+)?' + re.escape(name) + r'\s*=\s*', page)
    if not match:
        raise ValueError('Métadonnées YouTube indisponibles')
    return json.JSONDecoder().raw_decode(page[match.end():])[0]


def regular_video_ids(data):
    # Both generations of regular video cards on the channel's Videos tab.
    # Shorts and reels have separate renderers, regardless of their length.
    ids = set()
    def visit(node):
        if isinstance(node, dict):
            video = node.get('videoRenderer')
            if isinstance(video, dict) and isinstance(video.get('videoId'), str):
                ids.add(video['videoId'])
            model = node.get('lockupViewModel')
            if isinstance(model, dict) and model.get('contentType') == 'LOCKUP_CONTENT_TYPE_VIDEO' and isinstance(model.get('contentId'), str):
                ids.add(model['contentId'])
            for key, child in node.items():
                if key not in ('reelItemRenderer', 'shortsLockupViewModel'):
                    visit(child)
        elif isinstance(node, list):
            for child in node:
                visit(child)
    visit(initial_json(data, 'ytInitialData'))
    if not ids:
        raise ValueError('Aucune vidéo classique dans la chaîne')
    return ids


def landscape_dimensions(data, video_id):
    player = initial_json(data, 'ytInitialPlayerResponse')
    details = player.get('videoDetails', {})
    microformat = player.get('microformat', {}).get('playerMicroformatRenderer', {})
    if details.get('videoId') != video_id or details.get('channelId') != CHANNEL_ID or details.get('isLiveContent') or microformat.get('isShortsEligible') is True:
        raise ValueError('Vidéo classique non confirmée')
    sizes = []
    for key in ('formats', 'adaptiveFormats'):
        for item in player.get('streamingData', {}).get(key, []):
            width, height = item.get('width'), item.get('height')
            if isinstance(width, int) and isinstance(height, int) and 0 < height < width <= 16384:
                sizes.append((width, height))
    if not sizes:
        raise ValueError('Le format horizontal n’est pas confirmé')
    return max(sizes, key=lambda size: size[0] * size[1])


def latest_landscape(fetch):
    ids = regular_video_ids(fetch(VIDEOS_URL))
    for video in feed_videos(fetch(FEED_URL)):
        if video['videoId'] not in ids:
            continue
        try:
            width, height = landscape_dimensions(fetch('https://www.youtube.com/watch?v=' + video['videoId']), video['videoId'])
            return record({**video, 'width': width, 'height': height})
        except (ValueError, KeyError, TypeError, OSError):
            continue
    raise ValueError('Aucune vidéo classique horizontale confirmée')


def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; Mediatheque/1.0)'})
    with urllib.request.urlopen(request, timeout=20) as response:
        data = response.read(4 * 1024 * 1024 + 1)
    if len(data) > 4 * 1024 * 1024:
        raise ValueError('Réponse trop volumineuse')
    return data


def previous_record(output, current_url, fetch, french=False):
    values = []
    for read in ([lambda: Path(output).read_text(encoding='utf-8')] if Path(output).is_file() else []) + ([lambda: fetch(current_url)] if current_url else []):
        try:
            video = record(json.loads(read()))
            if video.get('format') == 'landscape' and (not french or not re.search(r'[\u0600-\u06ff]', video['title'])):
                values.append(video)
        except (ValueError, KeyError, TypeError, OSError):
            pass
    return max(values, key=lambda value: (timestamp(value['publishedAt']), bool(value.get('thumbnailUrl')))) if values else None


def save(output, video):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(video, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def refresh(output, current_url=None, fetch=download):
    output = Path(output)
    previous = previous_record(output, current_url, fetch)
    try:
        video = latest_landscape(fetch)
        if previous and timestamp(previous['publishedAt']) > timestamp(video['publishedAt']):
            video = dict(previous)
        print('YouTube : dernière vidéo horizontale ' + video['videoId'])
    except (ValueError, KeyError, TypeError, OSError, ET.ParseError):
        if previous is None:
            raise RuntimeError('Impossible de récupérer une vidéo horizontale valide')
        video = dict(previous)
        print('YouTube : dernière vidéo horizontale vérifiée conservée')
    thumbnail = '/images/youtube-' + video['videoId'] + '.jpg'
    destination = output.parent / thumbnail.lstrip('/')
    if not destination.is_file():
        sources = ['https://i.ytimg.com/vi/' + video['videoId'] + '/maxresdefault.jpg', 'https://i.ytimg.com/vi/' + video['videoId'] + '/sddefault.jpg']
        if current_url and previous and previous.get('thumbnailUrl') == thumbnail:
            sources.append(urllib.parse.urljoin(current_url, '.' + thumbnail))
        for source in sources:
            try:
                image = fetch(source)
                if not image.startswith(b'\xff\xd8\xff') or len(image) > 1024 * 1024:
                    raise ValueError('Miniature JPEG non valide')
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(image)
                break
            except (ValueError, OSError):
                continue
    video.pop('thumbnailUrl', None)
    if destination.is_file():
        video['thumbnailUrl'] = thumbnail
    save(output, video)
    return video, video != previous


def refresh_french(video, output, translations, current_url=None, fetch=download):
    previous = previous_record(output, current_url, fetch, french=True)
    translation = translations.get(video['videoId'], {}).get('fr', {}).get('title')
    if not translation:
        translation = next((entry.get('fr', {}).get('title') for entry in translations.values() if entry.get('originalTitle') == video['title']), None)
    if not translation and not re.search(r'[\u0600-\u06ff]', video['title']):
        translation = video['title']
    if isinstance(translation, str) and translation.strip() and not re.search(r'[\u0600-\u06ff]', translation):
        french = record({**video, 'title': translation})
        if previous and timestamp(previous['publishedAt']) > timestamp(french['publishedAt']):
            french = previous
    elif previous:
        french = previous
        print('Français : dernière vidéo traduite conservée en attente de traduction')
    else:
        raise ValueError('Une traduction française du titre est nécessaire')
    save(output, french)
    return french, french != previous


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default=str(root / 'site/latest-video.json'))
    parser.add_argument('--current-url')
    parser.add_argument('--french-output', default=str(root / 'site/latest-video-fr.json'))
    parser.add_argument('--current-french-url')
    parser.add_argument('--translations', default=str(root / 'site/video-localizations.json'))
    args = parser.parse_args()
    video, changed = refresh(args.output, args.current_url)
    _, french_changed = refresh_french(video, args.french_output, json.loads(Path(args.translations).read_text(encoding='utf-8')), args.current_french_url)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as handle:
            handle.write('changed=' + str(changed or french_changed).lower() + '\n')
