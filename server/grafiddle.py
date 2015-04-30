from flask import Flask, request, jsonify
from google.appengine.ext import ndb

app = Flask(__name__)
app.config['DEBUG'] = True


class Data(ndb.Model):
    data = ndb.JsonProperty(required=True)

class Option(ndb.Model):
    option = ndb.JsonProperty(required=True)

class Checkpoint(ndb.Model):
    data = ndb.JsonProperty(required=False)
    options = ndb.JsonProperty(required=False)
    author = ndb.StringProperty(required=False)
    # base = ndb.KeyProperty(kind="Checkpoint")
    date = ndb.DateTimeProperty(auto_now_add=True)


@app.route('/checkpoint', methods=['POST'])
def create_checkpoint():
    if not request.json:
        return 'Please provide data in JSON format', 400

    checkpoint = Checkpoint(data=request.json['data'],
                            options=request.json['options'],
                            author=request.json['author'])
    checkpoint.put()
    result = checkpoint.to_dict()
    result['id'] = checkpoint.key.id()
    result['date'] = checkpoint.date.isoformat()
    return jsonify(result)


@app.route('/checkpoint/<int:id>', methods=['GET'])
def get_checkpoint(id):
    # checkpoint = Checkpoint(id=5071522616049664)
    # c = checkpoint.get_by_id()
    # print c
    # return jsonify(c)
    return "requested id is %s" % id


@app.errorhandler(404)
def page_not_found(e):
    return 'Sorry, nothing at this URL.', 404
