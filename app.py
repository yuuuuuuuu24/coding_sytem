from flask import Flask, render_template, jsonify, request
from datetime import datetime
import zoneinfo

app = Flask(__name__)

# Default list of cities to display
DEFAULT_CITIES = [
    {"name": "東京", "zone": "Asia/Tokyo", "icon": "🇯🇵"},
    {"name": "ニューヨーク", "zone": "America/New_York", "icon": "🇺🇸"},
    {"name": "ロンドン", "zone": "Europe/London", "icon": "🇬🇧"},
    {"name": "パリ", "zone": "Europe/Paris", "icon": "🇫🇷"},
    {"name": "シドニー", "zone": "Australia/Sydney", "icon": "🇦🇺"},
]

@app.route('/')
def index():
    return render_template('index.html', cities=DEFAULT_CITIES)

@app.route('/api/time')
def get_times():
    # Return time details for the requested zones
    zones_param = request.args.getlist('zones')
    names_param = request.args.getlist('names')
    icons_param = request.args.getlist('icons')
    
    if zones_param and len(zones_param) == len(names_param):
        cities = [{"name": n, "zone": z, "icon": i if i else "🌐"} for n, z, i in zip(names_param, zones_param, icons_param)]
    else:
        cities = DEFAULT_CITIES
        
    times = []
    now_utc = datetime.now(zoneinfo.ZoneInfo("UTC"))
    
    for city in cities:
        try:
            tz = zoneinfo.ZoneInfo(city["zone"])
            city_time = now_utc.astimezone(tz)
            
            # Calculate offset
            utc_offset = city_time.utcoffset().total_seconds() / 3600
            offset_str = f"UTC{'+' if utc_offset >= 0 else ''}{int(utc_offset) if utc_offset.is_integer() else utc_offset}"
            
            # Day or night determination (e.g. 6:00 to 18:00 is day)
            is_day = 6 <= city_time.hour < 18
            
            # Format day of week in Japanese
            days_ja = ["月", "火", "水", "木", "金", "土", "日"]
            day_of_week_ja = days_ja[city_time.weekday()]
            
            times.append({
                "name": city["name"],
                "zone": city["zone"],
                "icon": city["icon"],
                "time": city_time.strftime("%H:%M:%S"),
                "hour": city_time.hour,
                "minute": city_time.minute,
                "second": city_time.second,
                "date": city_time.strftime(f"%Y年%m月%d日 ({day_of_week_ja})"),
                "offset": offset_str,
                "is_day": is_day
            })
        except Exception as e:
            continue
            
    return jsonify(times)

@app.route('/api/timezones')
def get_timezones():
    # Return list of common timezones for UI selection
    common_zones = [
        {"name": "東京", "zone": "Asia/Tokyo", "icon": "🇯🇵"},
        {"name": "ソウル", "zone": "Asia/Seoul", "icon": "🇰🇷"},
        {"name": "上海 / 北京", "zone": "Asia/Shanghai", "icon": "🇨🇳"},
        {"name": "香港", "zone": "Asia/Hong_Kong", "icon": "🇭🇰"},
        {"name": "シンガポール", "zone": "Asia/Singapore", "icon": "🇸🇬"},
        {"name": "シドニー", "zone": "Australia/Sydney", "icon": "🇦🇺"},
        {"name": "オークランド", "zone": "Pacific/Auckland", "icon": "🇳🇿"},
        {"name": "ホノルル", "zone": "Pacific/Honolulu", "icon": "🇺🇸"},
        {"name": "アンカレッジ", "zone": "America/Anchorage", "icon": "🇺🇸"},
        {"name": "ロサンゼルス", "zone": "America/Los_Angeles", "icon": "🇺🇸"},
        {"name": "デンバー", "zone": "America/Denver", "icon": "🇺🇸"},
        {"name": "シカゴ", "zone": "America/Chicago", "icon": "🇺🇸"},
        {"name": "ニューヨーク", "zone": "America/New_York", "icon": "🇺🇸"},
        {"name": "サンパウロ", "zone": "America/Sao_Paulo", "icon": "🇧🇷"},
        {"name": "ロンドン", "zone": "Europe/London", "icon": "🇬🇧"},
        {"name": "パリ", "zone": "Europe/Paris", "icon": "🇫🇷"},
        {"name": "ベルリン", "zone": "Europe/Berlin", "icon": "🇩🇪"},
        {"name": "カイロ", "zone": "Africa/Cairo", "icon": "🇪🇬"},
        {"name": "モスクワ", "zone": "Europe/Moscow", "icon": "🇷🇺"},
        {"name": "ドバイ", "zone": "Asia/Dubai", "icon": "🇦🇪"},
        {"name": "ニューデリー", "zone": "Asia/Kolkata", "icon": "🇮🇳"},
        {"name": "バンコク", "zone": "Asia/Bangkok", "icon": "🇹🇭"},
    ]
    return jsonify(common_zones)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
