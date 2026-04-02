import { useState, type SubmitEventHandler } from 'react';
import type { Book } from '../types/Book';
import { addBook } from '../api/BooksAPI';

interface NewBookFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const NewBookForm = ({ onSuccess, onCancel }: NewBookFormProps) => {
  const [formData, setFormData] = useState<Book>({
    bookId: 0,
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    classification: '',
    category: '',
    pageCount: 0,
    price: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await addBook(formData);
    onSuccess();
  };

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-4">Add New Book</h5>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="title" className="form-label">Book Title</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  className="form-control"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="author" className="form-label">Author</label>
                <input
                  id="author"
                  type="text"
                  name="author"
                  className="form-control"
                  value={formData.author}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="publisher" className="form-label">Publisher</label>
                <input
                  id="publisher"
                  type="text"
                  name="publisher"
                  className="form-control"
                  value={formData.publisher}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="isbn" className="form-label">ISBN</label>
                <input
                  id="isbn"
                  type="text"
                  name="isbn"
                  className="form-control"
                  value={formData.isbn}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="classification" className="form-label">Classification</label>
                <input
                  id="classification"
                  type="text"
                  name="classification"
                  className="form-control"
                  value={formData.classification}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="category" className="form-label">Category</label>
                <input
                  id="category"
                  type="text"
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="pageCount" className="form-label">Page Count</label>
                <input
                  id="pageCount"
                  type="number"
                  name="pageCount"
                  className="form-control"
                  value={formData.pageCount}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="price" className="form-label">Price</label>
                <input
                  id="price"
                  type="number"
                  name="price"
                  className="form-control"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Add Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBookForm;
