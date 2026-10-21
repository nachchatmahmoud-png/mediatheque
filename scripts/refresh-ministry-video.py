"""Refresh the homepage video from the public @Matnuhpv feed, without credentials."""
import argparse
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = 'UCIKc_HXIZnAmfO9ulxf80EQ'
CHANNEL_URL = 'https://www.youtube.com/@Matnuhpv'
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
    published = timestamp(value['publishedAt'])
    return {'version': 1, 'channelId': CHANNEL_ID, 'channelUrl': CHANNEL_URL,
            'videoId': value['videoId'], 'title': title.strip(), 'publishedAt': published.isoformat()}


def latest_from_feed(data, now=None):
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
    return max(videos, key=lambda video: timestamp(video['publishedAt']))


def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'MATNUHPV-Mediatheque/1.0'})
    with urllib.request.urlopen(request, timeout=20) as response:
        data = response.read(1024 * 1024 + 1)
    if len(data) > 1024 * 1024:
        raise ValueError('Réponse trop volumineuse')
    return data


def refresh(output, current_url=None, fetch=download):
    output = Path(output)
    previous = None
    if output.is_file():
        previous = record(json.loads(output.read_text(encoding='utf-8')))
    if current_url:
        try:
            previous = record(json.loads(fetch(current_url)))
        except (ValueError, KeyError, TypeError, OSError):
            pass
    try:
        video = latest_from_feed(fetch(FEED_URL))
        changed = video != previous
        print('YouTube : dernière vidéo ' + video['videoId'])
    except (ValueError, KeyError, TypeError, OSError, ET.ParseError):
        if previous is None:
            raise RuntimeError('Impossible de récupérer une vidéo valide')
        video, changed = previous, False
        print('YouTube : flux indisponible, dernière vidéo connue conservée')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(video, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as handle:
            handle.write('changed=' + str(changed).lower() + '\n')
    return video, changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default=str(Path(__file__).resolve().parents[1] / 'public/latest-video.json'))
    parser.add_argument('--current-url')
    args = parser.parse_args()
    refresh(args.output, args.current_url)
