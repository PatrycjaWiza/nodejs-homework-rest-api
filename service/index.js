const Contact = require("./schemas/contacts");

const listContacts = async () => Contact.find();
const getContactById = (id) => Contact.findOne({ _id: id });
const addContact = ({ name, email, phone }) =>
  Contact.create({ name, email, phone });
const updateContact = (id, fields) =>
  Contact.findByIdAndUpdate({ _id: id }, fields, { new: true });
const removeContact = (id) => Contact.findByIdAndRemove({ _id: id });

module.exports = {
  listContacts,
  getContactById,
  addContact,
  updateContact,
  removeContact,
};
