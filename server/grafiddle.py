from flask import Flask, request, jsonify
from google.appengine.ext import ndb
from options_handler import crossdomain

app = Flask(__name__)
app.config['DEBUG'] = True

not_found_msg = 'Sorry, nothing at this URL'


class Data(ndb.Model):
    data = ndb.JsonProperty(required=True)

class Option(ndb.Model):
    option = ndb.JsonProperty(required=True)

class Checkpoint(ndb.Model):
    data = ndb.JsonProperty(required=True)
    options = ndb.JsonProperty(required=True)
    title = ndb.StringProperty(required=False)
    author = ndb.StringProperty(required=False)
    base = ndb.KeyProperty(kind='Checkpoint')
    # tree = ndb.KeyProperty(kind='Checkpoint') # root
    date = ndb.DateTimeProperty(auto_now_add=True)


def checkpoint_to_json(cp):
    result = cp.to_dict()
    result['id'] = cp.key.id()
    if result['base'] is not None:
        result['base'] = cp.base.id()
    result['date'] = cp.date.isoformat()
    return jsonify(result)

@app.route('/')
def root():
  return app.send_static_file('index.html')

@app.route('/<path:path>')
def static_proxy(path):
  # send_static_file will guess the correct MIME type
  return app.send_static_file(path)

@app.route('/checkpoint', methods=['POST'])
@crossdomain(origin='*', headers='content-type')
def create_checkpoint():
    if not request.json:
        return 'Please provide data in JSON format', 400

    if 'data' not in request.json:
        return 'You forgot to set "data"', 400

    if 'options' not in request.json:
        return 'You forgot to set "options"', 400

    author = request.json['author'] if 'author' in request.json else 'Anonymous'
    title = request.json['title'] if 'title' in request.json else 'Unnamed Grafiddle'

    checkpoint = Checkpoint(data=request.json['data'], options=request.json['options'], title=title, author=author)

    # tree_cp = Checkpoint.get_by_id(int(request.json['tree']), parent=None)
    if 'base' in request.json and request.json['base'] is not None:
        cp = Checkpoint.get_by_id(int(request.json['base']), parent=None)
        if cp is not None:
            checkpoint.base=cp.key

    checkpoint.put()

    return checkpoint_to_json(checkpoint), 201


@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('index.html')


@app.route('/checkpoint/<int:id>', methods=['GET'])
@crossdomain(origin='*')
def get_checkpoint(id):
    id = int(id)
    checkpoint = Checkpoint.get_by_id(id, parent=None)

    if checkpoint is None:
        return not_found_msg, 404

    return checkpoint_to_json(checkpoint)



