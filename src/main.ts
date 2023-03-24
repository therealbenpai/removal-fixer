import { CommentContextActionEvent, Context, Devvit, KeyValueStorage, PostContextActionEvent, RedditAPIClient, UserContext, ConfigFormBuilder } from '@devvit/public-api';
import { Metadata } from '@devvit/protos';

const ReApprovalBase = [
    "Dear $NAME",
    "",
    "Your $TYPE was accidentally removed by a moderator. We have re-approved it and it should be visible again.",
    "We sincerely apologize for the inconvenience.",
    "",
    "If you have any questions, please feel free to message the moderators.",
    "",
    "Thank you for your cooperation.",
    "",
    "Signed",
    "r/$SUBREDDIT moderators",
    "",
    "---",
    "Note from the moderator:",
    "",
    "$REASON",
    "",
    "---"
]
const reddit = new RedditAPIClient()

class ModActions {
    public static async undoRemoval(event: PostContextActionEvent | CommentContextActionEvent, metadata?: Metadata) {
        const subreddit = (await reddit.getCurrentSubreddit(metadata));
        const author = (event.context === Context.POST ? event.post.author : event.comment.author);
        const ID = (event.context === Context.POST ? event.post.linkId : event.comment.linkId);
        const contextType = event.context;

        if (!ID || !contextType || !subreddit || !author) return { success: false, message: `Metadata is missing!`, };
        const reason = event.userInput?.fields.find((f) => f.key === 'reason')?.response || '';
        const reasonMessage = ReApprovalBase.join('\n').replace(/($SUBREDDIT)/gmi, subreddit.name).replace(/($NAME)/gmi, author).replace(/($TYPE)/gmi, contextType).replace(/($REASON)/gmi, reason);
        reddit.approve(ID, metadata);

        reddit.sendPrivateMessageAsSubreddit(
            {
                fromSubredditName: subreddit.name,
                to: author,
                subject: `Your post/comment was approved on ${subreddit.name}`,
                text: reasonMessage,
            }
        )

        return { success: true, message: `Approved ${contextType} by u/${author}!`, };
    }
}

Devvit.addActions([
    {
        name: 'Undo Removal',
        description: 'Undo the removal of this post/comment',
        context: Context.POST,
        userContext: UserContext.MODERATOR,
        userInput: new ConfigFormBuilder().textarea('reason', 'Reason for undoing removal').build(),
        handler: ModActions.undoRemoval,
    },
    {
        name: 'Undo Removal',
        description: 'Undo the removal of this post/comment',
        context: Context.COMMENT,
        userContext: UserContext.MODERATOR,
        userInput: new ConfigFormBuilder().textarea('reason', 'Reason for undoing removal').build(),
        handler: ModActions.undoRemoval,
    },
])

export default Devvit