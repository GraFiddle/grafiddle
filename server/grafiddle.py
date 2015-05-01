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
    author = ndb.StringProperty(required=False)
    base = ndb.KeyProperty(kind='Checkpoint')
    date = ndb.DateTimeProperty(auto_now_add=True)


def checkpoint_to_json(cp):
    result = cp.to_dict()
    result['id'] = cp.key.id()
    result['base'] = cp.base.id()
    result['date'] = cp.date.isoformat()
    return jsonify(result)

@app.route('/checkpoint', methods=['POST'])
@crossdomain(origin='*', headers='content-type')
def create_checkpoint():
    if not request.json:
        return 'Please provide data in JSON format', 400

    # if 'data' not in request.json:
    #     return 'You forgot to set "data"', 400
    #
    # if 'options' not in request.json:
    #     return 'You forgot to set "options"', 400

    base = ndb.Key("Checkpoint", int(request.json['base']))

    checkpoint = Checkpoint(data=request.json['data'],
                            options=request.json['options'],
                            author=request.json['author'],
                            base=base)
    checkpoint.put()

    return checkpoint_to_json(checkpoint), 201


@app.route('/checkpoint/<int:id>', methods=['GET'])
@crossdomain(origin='*')
def get_checkpoint(id):
    id = int(id)
    checkpoint = Checkpoint.get_by_id(id, parent=None)

    if checkpoint is None:
        return not_found_msg, 404

    return checkpoint_to_json(checkpoint)


@app.errorhandler(404)
def page_not_found(e):
    return not_found_msg, 404
