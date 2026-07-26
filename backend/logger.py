import json, logging, sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record):
        entry = {'ts': datetime.now(timezone.utc).isoformat(), 'level': record.levelname, 'event': record.getMessage()}
        if hasattr(record, 'extra'): entry.update(record.extra)
        if record.exc_info and record.exc_info[0]: entry['exception'] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False)

SENSITIVE_KEYS = {'resume_text', 'jd_text', 'access_token', 'analysis_result', 'generate_result'}

def log_event(event, **extra):
    safe = {k:v for k,v in extra.items() if k not in SENSITIVE_KEYS}
    logging.getLogger('resume_api').info(event, extra={'extra': safe})

def setup_logging():
    l = logging.getLogger('resume_api')
    l.setLevel(logging.INFO)
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(JSONFormatter())
    l.handlers.clear()
    l.addHandler(h)
    return l
