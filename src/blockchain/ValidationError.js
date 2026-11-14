class ValidationError extends Error {
    constructor(code, message, transaction) {
        super(message);
        this.code = code;
        this.transaction = transaction && {
            sender: transaction.sender, receiver: transaction.receiver,
            amount: transaction.amount, nonce: transaction.nonce
        };
    }
}
module.exports = ValidationError;
