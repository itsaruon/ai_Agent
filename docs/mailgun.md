Sending Basic Text
Sending a simple text-based email using Mailgun's HTTP API requires a few parameters at minimum:

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from='Excited User <postmaster@YOUR_DOMAIN_NAME>' \
    -F to=recipient-1@example.com \
    -F to=recipient-2@example.com \
    -F subject='Hello there!' \
    -F text='Testing some Mailgun awesomeness!'
What actually happened:

Mailgun assembled a valid MIME message based on your input parameters
Delivered the email to both recipients listed with the to parameters
Added log entries to our full text index that we Accepted the email, and if delivered successfully, added a Delivered event. (See the Events API for more details)
Send With Text and HTML Versions
By including both the 'text' and 'html' parameters, you can offer two different versions of your email to the user:

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from='Excited User <postmaster@YOUR_DOMAIN_NAME>' \
    -F to=recipient@example.com \
    -F subject="Hello there!" \
    -F text='This will be the text-only version' \
    --form-string html='<html><body><p>This is the HTML version</p></body></html>'
Note:
A common gotcha: note the use of --form-string in this example for the HTML part. Without this, your cURL command may fail to execute properly!

Send a Single Message With Tracking
While tracking can be enabled for all messages in your Dashboard, you can also selectively enable tracking on a per-message basis. To enable all tracking types you use the 'o:tracking="yes"' parameter. Otherwise, you can enable only specific tracking for opens ('o:tracking-opens') or clicks ('o:tracking-clicks'):

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from='Excited User <postmaster@YOUR_DOMAIN_NAME>' \
    -F to=recipient@example.com \
    -F subject="Hello there!" \
    -F text='Testing some Mailgun awesomeness!' \
    -F o:tracking-opens="yes"
Send a Message using a Template with variable substitution
Not all templates use variables, but assuming it has variable called "name", here are two ways of going about the substitution. The first is recommended since it will hide the variables from the MIME and not show in events.

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from="Excited User <postmaster@YOUR_DOMAIN_NAME>" \
    -F to="recipient@example.com" \
    -F subject="Mailgun is awesome" \
    -F template="My Great Template Name" \
    -F t:variables="{\"name\":\"Foo Bar\"}"
Or, the old way, which will include the variables in the MIME under X-Mailgun-Variables and they will appear in the events / webhooks under user-variables

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from="Excited User <postmaster@YOUR_DOMAIN_NAME>" \
    -F to="recipient@example.com" \
    -F subject="Mailgun is awesome" \
    -F template="My Great Template Name" \
    -F v:name="Foo Bar"
Send a Customized Batch Message
Batch messages are a great way to send emails to multiple people, while still being able to customize the content for each recipient.

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from="Excited User <postmaster@YOUR_DOMAIN_NAME>" \
    -F to="recipient@example.com, recipient-two@example.com" \
    -F subject="Mailgun is awesome" \
    -F text="Hello %recipient.fname% %recipient.lname%! Enjoy a free %recipient.gift%" \
    -F recipient-variables="{\"recipient@example.com\": {\"fname\":\"Bob\", \"lname\":\"Mailgun\", \"gift\":\"high five\"}, \"recipient-two@example.com\": {\"fname\":\"Foo\", \"lname\":\"Bar\", \"gift\":\"fist bump\"}}"
Send a Message With Specified Delivery Time
The 'o:deliverytime' option allows you to specify when an email should be sent. It uses RFC822 date formatting and can be no more than 3 days in the future:

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from='Excited User <postmaster@YOUR_DOMAIN_NAME>' \
    -F to=recipient@example.com \
    -F subject="Hello there!" \
    -F text='Testing some Mailgun awesomeness!' \
    -F o:deliverytime='Fri, 14 Oct 2011 23:10:10 -0000'
Note:
If your billing plan supports 7 or more days of storage capability, you can schedule emails out up to 7 days.

Send a Message using Tags
Mailgun allows you to Tag emails for further analytics within our platform:

curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/YOUR_DOMAIN_NAME/messages \
    -F from='Excited User <postmaster@YOUR_DOMAIN_NAME>' \
    -F to=recipient@example.com \
    -F subject="Hello there!" \
    -F text='Testing some Mailgun awesomeness!' \
    -F o:tag='September newsletter' \
    -F o:tag='newsletters'
See Tags for more information!

Re-Delivering a Previously-Sent Email
By default: emails sent through our APIs are stored for 72 hours. If you navigate to your Dashboard, check the Logs page and find a message sent within this time frame that you wish to resend, you should have a 'storage.url' field. Using that exact URL in your POST request, along with one or more 'to' parameters, you can deliver that MIME to the provided recipients:

curl -s --user 'api:YOUR_API_KEY' {{STORAGE.URL}} \
    -F to='bob@example.com, john@example.com'
Send via SMTP
First you'll need to grab your SMTP credentials (user and password).

SMTP credentials are set and managed on a per-domain basis. You can view and modify them via our HTTP API or UI. To access them in our UI, navigate on the sidebar to Sending -> Domain Settings, select your domain from the dropdown, then select the SMTP Credentials tab. Go to the article Can I Customize My SMTP Credentials? for more information.

To send an email via SMTP you can utilize Swaks via your command line.

Copy
# Swaks is the cURL equivalent for SMTP, install it first:
curl http://www.jetmore.org/john/code/swaks/files/swaks-20130209.0/swaks -o swaks
# Set the permissions for the script so you can run it
chmod +x swaks
# It's based on perl, so install perl
sudo apt-get -y install perl
# now send!
./swaks --auth \
       --server smtp.mailgun.org \
       --au YOUR-SMTP-USER \
       --ap YOUR-SMTP-PASSWORD \
       --to recipient@example.com \
       --h-Subject: "Hello" \
       --body 'Testing some Mailgun awesomness!'