#!/usr/bin/env python3

# run this script with a cron job to delete expired files
# it takes the path of your upload folder as in argument
# e.g. ./cleanup.py /home/user/0x1/uploads

# modified from https://github.com/lachs0r/0x0/blob/master/cleanup.py

import os, sys, time, datetime, json

os.chdir(os.path.dirname(sys.argv[1]))

files = [f for f in os.listdir(".")]

jsonData = json.load(open('config.json'))
maxage = jsonData['filePersistance']

for f in files:
    stat = os.stat(f)
    systime = time.time()
    age = datetime.timedelta(seconds = systime - stat.st_mtime).days

    if age >= maxage:
        os.remove(f)